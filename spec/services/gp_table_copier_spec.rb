require 'spec_helper'

describe GpTableCopier, :database_integration => true do
  def call_sql(sql_command, schema = schema, account = account)
    schema.with_gpdb_connection(account) do |connection|
      connection.exec_query(sql_command)
    end
  end

  def distribution_key_sql(schema_name, table_name)
    <<-DISTRIBUTION_KEY_SQL
      SELECT attname
      FROM   (SELECT *, generate_series(1, array_upper(attrnums, 1)) AS rn
      FROM   gp_distribution_policy where localoid = '#{schema_name}.#{table_name}'::regclass
      ) y, pg_attribute WHERE attrelid = '#{schema_name}.#{table_name}'::regclass::oid AND attrnums[rn] = attnum ORDER by rn;
    DISTRIBUTION_KEY_SQL
  end

  let(:account) { InstanceIntegration.real_gpdb_account }
  let(:user) { account.owner }
  let(:database) { InstanceIntegration.real_database }
  let(:schema) { database.schemas.find_by_name('test_schema') }
  let(:source_table_name) { "src_table" }
  let(:source_dataset) { schema.datasets.find_by_name(source_table_name) }
  let(:sandbox) { schema } # For testing purposes, src schema = sandbox
  let(:destination_table_name) { "dst_table" }
  let(:table_def) { '"id" integer, "name" text, "id2" integer, "id3" integer, PRIMARY KEY("id2", "id3", "id")' }
  let(:distrib_def) { 'DISTRIBUTED BY("id2", "id3")' }
  let(:attributes) { {"workspace_id" => workspace.id, "to_table" => destination_table_name, "new_table" => "true", "import_id" => import.id }.merge(extra_attributes) }
  let(:copier) { GpTableCopier.new(source_dataset.id, user.id, attributes) }
  let(:add_rows) { true }
  let(:workspace) { FactoryGirl.create :workspace, :owner => user, :sandbox => sandbox }
  let!(:dataset_import_created_event_id) do
    event = Events::DatasetImportCreated.by(user).add(
        :workspace => workspace,
        :dataset => nil,
        :destination_table => destination_table_name,
        :reference_id => import.id
    )
    event.id
  end
  let(:extra_attributes) { {} }
  let(:import) { imports(:two) }

  after do
    call_sql("DROP TABLE IF EXISTS \"#{schema.name}\".\"#{source_table_name}\";") unless source_table_name =~ /^candy/
    call_sql("DROP TABLE IF EXISTS \"#{sandbox.name}\".\"#{destination_table_name}\";") unless (
    (destination_table_name == source_table_name) || destination_table_name == "other_base_table")
  end

  context "actually running the query" do
    before do
      call_sql("drop table if exists \"#{source_table_name}\";")
      call_sql("drop table if exists \"#{destination_table_name}\";")
      call_sql("create table \"#{source_table_name}\"(#{table_def}) #{distrib_def};")
      Dataset.refresh(account, schema)
      if add_rows
        call_sql("insert into \"#{source_table_name}\"(id, name, id2, id3) values (1, 'marsbar', 3, 5);")
        call_sql("insert into \"#{source_table_name}\"(id, name, id2, id3) values (2, 'kitkat', 4, 6);")
      end
    end

    context ".run_import" do
      context "in new table" do
        it "creates a new table copier and runs it" do
          GpTableCopier.run_import(source_dataset.id, user.id, attributes)
          dest_rows = call_sql("SELECT * FROM #{destination_table_name}", sandbox)
          dest_rows.count.should == 2
        end

        describe "on a successful import" do
          before do
            GpTableCopier.run_import(source_dataset.id, user.id, attributes)
          end

          it "creates a DatasetImportSuccess" do
            event = Events::DatasetImportSuccess.last
            event.actor.should == user
            event.dataset.name.should == destination_table_name
            event.dataset.schema.should == sandbox
            event.workspace.should == workspace
            event.source_dataset.should == source_dataset
          end

          it "creates a notification" do
            notification = Notification.last
            notification.recipient_id.should == user.id
            notification.event_id.should == Events::DatasetImportSuccess.last.id
          end

          it "marks the import as success" do
            import.reload
            import.success.should be_true
            import.finished_at.should_not be_nil
          end

          it "updates the destination dataset id" do
            import.reload
            import.success.should be_true
            import.destination_dataset_id.should_not be_nil
          end

          it "sets the dataset attribute of the DATASET_IMPORT_CREATED event" do
            event = Events::DatasetImportCreated.last
            event.id = dataset_import_created_event_id
            event.actor.should == user
            event.dataset.name.should == destination_table_name
            event.dataset.schema.should == sandbox
            event.workspace.should == workspace
          end
        end

        describe "on a failed import" do
          it "creates a DatasetImportFailed" do
            expect {
              GpTableCopier.run_import(-1, user.id, attributes)
            }.to raise_exception(ActiveRecord::RecordNotFound)
            event = Events::DatasetImportFailed.last
            event.actor.should == user
            event.error_message.should match "Couldn't find Dataset with id=-1"
            event.workspace.should == workspace
            event.source_dataset.should == nil
            event.destination_table.should == destination_table_name
          end

          it "creates a notification" do
            expect {
              GpTableCopier.run_import(-1, user.id, attributes)
            }.to raise_exception(ActiveRecord::RecordNotFound)

            notification = Notification.last
            notification.recipient_id.should == user.id
            notification.event_id.should == Events::DatasetImportFailed.last.id
          end

          it "marks the import as failed" do
            any_instance_of(GpTableCopier) do |copier|
              stub(copier).run { raise Exception }
            end

            expect {
              GpTableCopier.run_import(source_dataset.id, user.id, attributes)
            }.to raise_exception

            import.reload
            import.success.should be_false
            import.finished_at.should_not be_nil
          end
        end

        it "if the table is expected to exist but does not, it raises an exception and creates a failed import event" do
          extra_attributes.merge!("new_table" => false)
          expect {
            GpTableCopier.run_import(source_dataset.id, user.id, attributes)
          }.to raise_exception(ActiveRecord::RecordNotFound)
          Events::DatasetImportFailed.last.tap do |event|
            event.actor.should == user
            event.destination_table.should == destination_table_name
            event.workspace.should == workspace
            event.source_dataset.id.should == source_dataset.id
            event.error_message.should == "Couldn't find destination table."
          end
        end
      end

      context "in existing table" do
        before do
          extra_attributes.merge!("new_table" => false)
          call_sql("create table \"#{destination_table_name}\"(#{table_def}) #{distrib_def};")
        end

        it "creates a existing table copier and runs it" do
          GpTableCopier.run_import(source_dataset.id, user.id, attributes)
          dest_rows = call_sql("SELECT * FROM #{destination_table_name}", sandbox)
          dest_rows.count.should == 2
        end

        context "when we are scheduled to create a new table but the table already exists" do
          it "successfully adds the data into the existing table" do
            extra_attributes.merge!("new_table" => true)
            call_sql("insert into \"#{destination_table_name}\"(id, name, id2, id3) values (11, 'marsbar-1', 31, 51);")
            GpTableCopier.run_import(source_dataset.id, user.id, attributes)
            dest_rows = call_sql("SELECT * FROM #{destination_table_name}", sandbox)
            dest_rows.count.should == 3
          end
        end

        context "when it should truncate" do
          before do
            extra_attributes.merge!("truncate" => true)
            call_sql("insert into \"#{destination_table_name}\"(id, name, id2, id3) values (11, 'marsbar-1', 31, 51);")
          end

          it "it truncates the destination table and import fresh" do
            dest_rows = call_sql("SELECT * FROM #{destination_table_name}", sandbox)
            dest_rows.count.should == 1
            GpTableCopier.run_import(source_dataset.id, user.id, attributes)
            dest_rows = call_sql("SELECT * FROM #{destination_table_name}", sandbox)
            dest_rows.count.should == 2
          end

        end

        context "when it should not truncate" do
          before do
            extra_attributes.merge!("new_table" => "false", "truncate" => "false")
            call_sql("insert into \"#{destination_table_name}\"(id, name, id2, id3) values (11, 'marsbar-1', 31, 51);")
          end

          it "it truncates the destination table and import fresh" do
            dest_rows = call_sql("SELECT * FROM #{destination_table_name}", sandbox)
            dest_rows.count.should == 1
            GpTableCopier.run_import(source_dataset.id, user.id, attributes)
            dest_rows = call_sql("SELECT * FROM #{destination_table_name}", sandbox)
            dest_rows.count.should == 3
          end

        end

        it "creates a DatasetImportSuccess on a successful import" do
          GpTableCopier.run_import(source_dataset.id, user.id, attributes)
          event = Events::DatasetImportSuccess.last
          event.actor.should == user
          event.dataset.name.should == destination_table_name
          event.dataset.schema.should == sandbox
          event.workspace.should == workspace
          event.source_dataset.should == source_dataset
        end

        it "creates a DatasetImportFailed on a failed import" do
          expect {
            GpTableCopier.run_import(-1, user.id, attributes)
          }.to raise_exception(ActiveRecord::RecordNotFound)
          event = Events::DatasetImportFailed.last
          event.actor.should == user
          event.error_message.should match "Couldn't find Dataset with id=-1"
          event.workspace.should == workspace
          event.source_dataset.should == nil
          event.destination_table.should == destination_table_name
        end
      end
    end

    context "when the source dataset is a chorus view" do
      let(:source_dataset) { datasets(:executable_chorus_view) }

      context "when creating a new table" do
        before do
          call_sql("drop table if exists \"#{destination_table_name}\";")
        end

        it "should still work" do
          copier.run
          GpdbTable.refresh(account, schema)
          database.find_dataset_in_schema(destination_table_name, sandbox.name).should be_a(GpdbTable)
        end
      end

      context "in existing table" do
        let(:table_def) { 'LIKE "test_schema"."base_table1"' }
        let(:distrib_def) { 'DISTRIBUTED RANDOMLY' }
        let(:add_rows) { false }

        before do
          extra_attributes.merge!("new_table" => false)
          call_sql("create table \"#{destination_table_name}\"(#{table_def}) DISTRIBUTED RANDOMLY;")
        end

        it "should still work" do
          copier.run
          GpdbTable.refresh(account, schema)
          database.find_dataset_in_schema(destination_table_name, sandbox.name).should be_a(GpdbTable)
        end
      end
    end

    context "with standard input" do
      before do
        copier.run
        GpdbTable.refresh(account, schema)
      end

      it "creates the new table" do
        database.find_dataset_in_schema(destination_table_name, sandbox.name).should be_a(GpdbTable)
      end

      it "copies the constraints" do
        dest_constraints = call_sql("SELECT constraint_type, table_name FROM information_schema.table_constraints WHERE table_name = '#{destination_table_name}'", sandbox)
        src_constraints = call_sql("SELECT constraint_type, table_name FROM information_schema.table_constraints WHERE table_name = '#{source_table_name}'")

        dest_constraints.count.should == src_constraints.count
        dest_constraints.each_with_index do |constraint, i|
          constraint["constraint_type"].should == src_constraints[i]["constraint_type"]
          constraint["table_name"].should == destination_table_name
        end
      end

      it "copies the distribution keys" do
        dest_distribution_keys = call_sql(distribution_key_sql(sandbox.name, destination_table_name), sandbox)
        src_distribution_keys = call_sql(distribution_key_sql(schema.name, source_table_name))

        dest_distribution_keys.should == src_distribution_keys
      end


      it "copies the rows" do
        dest_rows = call_sql("SELECT * FROM #{destination_table_name}", sandbox)
        dest_rows.count.should == 2
      end
    end

    context "when the rows are limited" do
      before do
        extra_attributes.merge!("sample_count" => 1)
        copier.run
        GpdbTable.refresh(account, schema)
      end

      it "copies the rows up to limit" do
        dest_rows = call_sql("SELECT * FROM #{destination_table_name}", sandbox)
        dest_rows.count.should == 1
      end
    end

    context "when the row limit value is 0" do
      before do
        extra_attributes.merge!("sample_count" => 0)
        copier.run
        GpdbTable.refresh(account, schema)
      end

      it "creates the table and copies 0 rows" do
        dest_rows = call_sql("SELECT * FROM #{destination_table_name}", sandbox)
        dest_rows.count.should == 0
      end
    end

    context "when the sandbox and src schema are not the same" do
      let(:sandbox) { database.schemas.find_by_name('test_schema2') }

      it "creates a new table in the correct schema" do
        copier.run
        GpdbTable.refresh(account, sandbox)

        database.find_dataset_in_schema(destination_table_name, sandbox.name).should be_a(GpdbTable)
        dest_rows = call_sql("SELECT * FROM #{destination_table_name}", sandbox)
        dest_rows.count.should == 2
      end

      context "when the destination table already exists" do
        let(:destination_table_name) { "other_base_table" }

        it "does not import the table raises an exception" do
          original_columns = call_sql("select column_name,* from information_schema.columns where table_name = '#{destination_table_name}';", sandbox)

          expect { copier.run }.to raise_exception
          columns = call_sql("select column_name,* from information_schema.columns where table_name = '#{destination_table_name}';", sandbox)
          columns.should == original_columns
          columns.count.should_not == 4
        end
      end
    end

    context "when the src and dst tables are the same" do
      let(:destination_table_name) { source_table_name }

      it "raises an exception" do
        expect { copier.run }.to raise_exception
      end
    end

    context "tables have weird characters" do
      let(:source_table_name) { "2dandy" }
      let(:destination_table_name) { "2dst_dandy" }

      it "single quotes table and schema names if they have weird chars" do
        copier.run

        call_sql("SELECT * FROM #{copier.destination_table_fullname}").length.should == 2
      end
    end

    context "when the source table is empty" do
      let(:add_rows) { false }

      it "creates an empty destination table" do
        copier.run
        call_sql("SELECT * FROM #{copier.destination_table_fullname}").length.should == 0
      end
    end

    context "for a table with 1 column and no primary key, distributed randomly" do
      let(:add_rows) { false }
      let(:table_def) { '"2id" integer' }
      let(:distrib_def) { 'DISTRIBUTED RANDOMLY' }

      it "should have DISTRIBUTED RANDOMLY for its distribution key clause" do
        copier.distribution_key_clause.should == "DISTRIBUTED RANDOMLY"
      end
    end

    context "when the import failed" do
      before do
        mock(copier).execute_sql(anything, anything) { raise StandardError, 'Internal Error' }
      end

      it "display the sql error message" do
        lambda { copier.run }.should raise_error(GpTableCopier::ImportFailed, "Internal Error")
      end
    end
  end

  describe "#table_definition" do
    let(:definition) do
      schema.with_gpdb_connection(account) do |conn|
        copier.table_definition(conn)
      end
    end
    let(:definition_with_keys) do
      schema.with_gpdb_connection(account) do |conn|
        copier.table_definition_with_keys(conn)
      end
    end

    context "for a table with 0 columns" do
      let(:source_table_name) { 'candy_empty' }
      let(:table_def) { '' }

      it "should have the correct table definition" do
        definition.should == table_def
      end

      it "should have the correct table definition with keys" do
        definition_with_keys.should == table_def
      end
    end

    context "for a table with 1 column and no primary key, distributed randomly" do
      let(:table_def) { '"2id" integer' }
      let(:source_table_name) { 'candy_one_column' }
      let(:distrib_def) { "DISTRIBUTED RANDOMLY" }

      it "should have the correct table definition" do
        definition.should == table_def
      end

      it "should have the correct table definition with keys" do
        definition_with_keys.should == table_def
      end

      it "should have DISTRIBUTED RANDOMLY for its distribution key clause" do
        copier.distribution_key_clause.should == "DISTRIBUTED RANDOMLY"
      end
    end

    context "for a table with a composite primary key" do
      let(:table_def) { '"id" integer, "id2" integer, PRIMARY KEY("id", "id2")' }
      let(:source_table_name) { 'candy_composite' }

      it "should have the correct table definition with keys" do
        definition_with_keys.should == table_def
      end
    end
  end
end
