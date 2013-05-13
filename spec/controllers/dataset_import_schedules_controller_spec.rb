require 'spec_helper'

describe DatasetImportSchedulesController do
  let(:user) { users(:owner) }
  let(:import_schedule) { import_schedules(:default) }

  before { log_in user }

  describe "#index" do
    let(:dataset) { import_schedule.source_dataset }

    generate_fixture "datasetImportScheduleSet.json" do
      get :index, :workspace_id => import_schedule.workspace_id, :dataset_id => dataset.id
    end

    shared_examples_for "import data" do
      context "with an import schedule" do
        it 'returns the import schedule' do
          get :index, :workspace_id => import_schedule.workspace_id, :dataset_id => dataset.id

          response.should be_success
          decoded_response.length.should == 1
          import_schedule = decoded_response.first
          import_schedule.to_table.should == import_schedule.to_table
          import_schedule.frequency.should == import_schedule.frequency
          import_schedule.dataset_id.should == dataset.id.to_s
        end
      end

      context 'without a schedule' do
        it 'returns an empty list' do
          import_schedule.delete
          get :index, :workspace_id => import_schedule.workspace_id, :dataset_id => dataset.id
          response.should be_success
          decoded_response.length.should == 0
        end
      end
    end

    context 'for a source dataset' do
      let!(:dataset) { import_schedule.source_dataset }
      it_should_behave_like 'import data'
    end

    context 'when requesting for the destination dataset' do
      let!(:dataset) { FactoryGirl.create(:gpdb_table, :schema => import_schedule.workspace.sandbox, :name => import_schedule.to_table) }

      it 'returns an empty list of schedules' do
        get :index, :workspace_id => import_schedule.workspace_id, :dataset_id => dataset.id
        response.should be_success
        decoded_response.length.should == 0
      end
    end

    it 'authorizes' do
      log_in users(:default)
      get :index, :workspace_id => workspaces(:private).id, :dataset_id => dataset.id

      response.should be_forbidden
    end
  end

  describe '#create' do
    let(:source_table) { datasets(:source_table) }
    let(:archived_workspace) { workspaces(:archived) }
    let(:active_workspace) { workspaces(:public) }
    let(:to_table) { "the_new_table" }
    let(:new_table) { true }

    let(:attributes) {
      {
          :to_table => to_table,
          :sample_count => "12",
          :workspace_id => active_workspace.to_param,
          :truncate => "true",
          :new_table => new_table,
          :frequency => "weekly",
          :start_datetime => "2012-08-23T23:00:00.0",
          :end_date => "2012-08-24",
          :dataset_id => source_table.to_param
      }
    }

    let(:start) { DateTime.parse("Thu, 23 Aug 2012 23:00:00") }

    it "creates an import schedule" do
      any_instance_of(ImportSchedule) do |import_schedule|
        stub(import_schedule).valid? { true }
      end

      Timecop.freeze(start - 1.hour) do
        expect {
          post :create, attributes
        }.to change(ImportSchedule, :count).by(1)

        import_schedule = ImportSchedule.last
        import_schedule.start_datetime.should == start
        import_schedule.end_date.should == Date.parse("2012-8-24T00:00:00Z")
        import_schedule.workspace.should == active_workspace
        import_schedule.source_dataset.should == source_table
        import_schedule.frequency.should == 'weekly'
        import_schedule.to_table.should == "the_new_table"
        import_schedule.new_table.should == true
        import_schedule.sample_count.should == 12
        import_schedule.user.should == user
        import_schedule.truncate.should == true
        import_schedule.next_import_at.should == start
      end
    end

    it "creates an Import scheduled event" do
      any_instance_of(ImportSchedule) do |import_schedule|
        stub(import_schedule).valid? { true }
      end

      expect {
        post :create, attributes
      }.to change(Events::WorkspaceImportCreated, :count).by(1)

      event = Events::WorkspaceImportCreated.last

      event.actor.should == user
      event.dataset.should == nil
      event.source_dataset.should == source_table
      event.workspace.should == active_workspace
      event.destination_table.should == 'the_new_table'
    end

    it "presents an import schedule" do
      any_instance_of(ImportSchedule) do |import_schedule|
        stub(import_schedule).valid? { true }
      end

      mock_present do |schedule|
        schedule.should be_a(ImportSchedule)
        schedule.id.should_not be_nil
        schedule.workspace.should == active_workspace
        schedule.user.should == user
        schedule.sample_count.should == 12
        schedule.new_table.should be_true
        schedule.truncate.should be_true
        schedule.to_table.should == 'the_new_table'
        schedule.frequency.should == 'weekly'
        schedule.start_datetime.should == DateTime.parse("2012-08-23T23:00:00.0")
        schedule.end_date.should == Date.parse("2012-08-24")
        schedule.source_dataset.should == source_table
      end
      post :create, attributes
    end

    it "returns an error for archived workspaces" do
      archived_workspace.source_datasets << source_table
      attributes[:workspace_id] = archived_workspace.id
      post :create, attributes

      response.code.should == "403"
    end

    it "does not create an Import scheduled event if the schedule is not saved" do
      archived_workspace.source_datasets << source_table
      attributes[:workspace_id] = archived_workspace.id

      expect {
        post :create, attributes
      }.to change(Events::WorkspaceImportCreated, :count).by(0)
    end

    it "should return 422 if frequency is invalid" do
      attributes[:frequency] = "hello123"
      post :create, attributes

      response.code.should == "422"
    end

    context "the destination table already exists" do
      let(:to_table) { active_workspace.sandbox.datasets.first.name }
      let(:new_table) { false }

      it "should create a Import scheduled event with the correct destination dataset" do
        any_instance_of(GpdbDataset) do |d|
          stub(d).can_import_into(anything) { true }
        end

        any_instance_of(ImportSchedule) do |import_schedule|
          stub(import_schedule).valid? { true }
        end

        expect {
          post :create, attributes
        }.to change(Events::WorkspaceImportCreated, :count).by(1)

        event = Events::WorkspaceImportCreated.last
        event.dataset.name.should == to_table
        event.destination_table.should == to_table
      end
    end

    it "uses authorization" do
      mock(subject).authorize! :can_edit_sub_objects, active_workspace
      post :create, attributes
    end
  end

  describe "#update" do
    let(:source_table) { import_schedule.source_dataset }

    let(:attributes) {
      {
          :id => import_schedule.id,
          :dataset_id => source_table.id,
          :workspace_id => 3482374324
      }
    }

    describe "updating an import schedule that not exists" do
      it "should return an error" do
        put :update, attributes.merge(:id => 8614698)
        response.should_not be_success
        response.code.should == "404"
      end
    end

    describe "updating other values of Import schedule" do
      let(:frequency) { "daily" }
      let(:to_table) { import_schedule.workspace.sandbox.datasets.first }

      it "updates the start time for the import schedule" do
        any_instance_of(ImportSchedule) do |import_schedule|
          stub(import_schedule).valid? { true }
        end

        put :update, attributes.merge(:start_datetime => '2012-01-01T0:00:00')
        import_schedule.reload.start_datetime.should == DateTime.parse('2012-01-01T0:00:00')
      end

      it "updates the import's frequency only and returns success" do
        any_instance_of(ImportSchedule) do |import_schedule|
          stub(import_schedule).table_exists? { false }
        end

        put :update, attributes.merge(:frequency => frequency)
        response.code.should == "200"
        import_schedule.reload

        import_schedule.frequency.should == frequency
        import_schedule.end_date.should == import_schedule.end_date
        import_schedule.start_datetime.should == import_schedule.start_datetime
      end

      it "returns an error when importing into a new table but name already exists" do
        any_instance_of(ImportSchedule) do |import_schedule|
          stub(import_schedule).table_exists? { true }
        end

        put :update, attributes.merge(:new_table => 'true', :to_table => to_table.name)
        response.code.should == '422'
        decoded_errors.fields.base.TABLE_EXISTS.table_name == to_table.name
      end

      it "returns an error when importing into an existing table but name doesnt exist" do
        any_instance_of(ImportSchedule) do |import_schedule|
          stub(import_schedule).table_exists? { false }
        end

        put :update, attributes.merge(:new_table => 'false', :to_table => "non_existent")
        response.code.should == '422'
        decoded_errors.fields.base.TABLE_NOT_EXISTS.table_name == "non_existent"
      end

      it "uses authorization" do
        mock(subject).authorize! :can_edit_sub_objects, Workspace.find(import_schedule.workspace_id)
        put :update, :id => import_schedule.id, :workspace_id => 3482374324, :dataset_id => 8675309
      end
    end


    it "makes a IMPORT_SCHEDULE_UPDATED event" do
      any_instance_of(ImportSchedule) do |import_schedule|
        stub(import_schedule).valid? { true }
      end

      expect {
        put :update, attributes.merge(:new_table => 'true', :to_table => "new_table_non_existent")
      }.to change(Events::ImportScheduleUpdated, :count).by(1)

      event = Events::ImportScheduleUpdated.last
      event.workspace.should == import_schedule.workspace
      event.source_dataset.should == import_schedule.source_dataset
      event.destination_table.should == "new_table_non_existent"
    end

  end

  describe "#destroy" do
    let(:source_table) { Dataset.find(import_schedule[:source_dataset_id]) }

    it "deletes the import schedule and returns success" do
      any_instance_of(ImportSchedule) do |import_schedule|
        stub(import_schedule).table_exists? { false }
      end

      delete :destroy, :id => import_schedule.id, :workspace_id => 3482374324, :dataset_id => source_table.id

      response.code.should == "200"
      import_schedule.reload.deleted_at.should_not be_nil
      ImportSchedule.where(
          :workspace_id => import_schedule.workspace_id,
          :source_dataset_id => source_table.id).should be_empty
    end

    it "uses authorization" do
      mock(subject).authorize! :can_edit_sub_objects, Workspace.find(import_schedule.workspace_id)
      delete :destroy, :id => import_schedule.id, :workspace_id => 3482374324, :dataset_id => source_table.id
    end

    it "makes a IMPORT_SCHEDULE_DELETED event" do
      expect {
        delete :destroy, :id => import_schedule.id, :dataset_id => source_table.id, :workspace_id => import_schedule.workspace_id
      }.to change(Events::ImportScheduleDeleted, :count).by(1)
      event = Events::ImportScheduleDeleted.last
      event.workspace.should == import_schedule.workspace
      event.source_dataset.should == import_schedule.source_dataset
      event.destination_table.should == import_schedule.to_table
    end
  end

  describe "smoke test for import schedules", :greenplum_integration do
    # In the test, use gpfdist to move data between tables in the same schema and database
    let(:data_source_account) { GreenplumIntegration.real_account }
    let(:user) { data_source_account.owner }
    let(:database) { GreenplumIntegration.real_database }
    let(:schema_name) { 'test_schema' }
    let(:schema) { database.schemas.find_by_name(schema_name) }
    let(:source_table) { "candy" }
    let(:source_table_name) { "\"#{schema_name}\".\"#{source_table}\"" }
    let(:destination_table_name) { "dst_candy" }
    let(:destination_table_fullname) { "\"test_schema\".\"dst_candy\"" }
    let(:workspace) { workspaces(:public).tap { |ws| ws.owner = user; ws.members << user; ws.sandbox = schema; ws.save! } }
    let(:sandbox) { workspace.sandbox }

    let(:gpdb_params) do
      {
          :host => data_source_account.data_source.host,
          :port => data_source_account.data_source.port,
          :database => database.name,
          :username => data_source_account.db_username,
          :password => data_source_account.db_password,
          :adapter => "jdbcpostgresql"}
    end

    let(:gpdb1) { ActiveRecord::Base.postgresql_connection(gpdb_params) }
    let(:gpdb2) { ActiveRecord::Base.postgresql_connection(gpdb_params) }

    let(:table_def) { '"id" numeric(4,0),
                   "name" character varying(255),
                    "id2" integer,
                    "id3" integer,
                    "date_test" date,
                    "fraction" double precision,
                    "numeric_with_scale" numeric(4,2),
                    "time_test" time without time zone,
                    "time_with_precision" time(3) without time zone,
                    "time_with_zone" time(3) with time zone,
                    "time_stamp_with_precision" timestamp(3) with time zone,
                    PRIMARY KEY("id2", "id3", "id")'.tr("\n", "").gsub(/\s+/, " ").strip }

    let(:source_dataset) { schema.datasets.find_by_name(source_table) }
    let(:import_attributes) do
      {
          :workspace => workspace,
          :to_table => destination_table_name,
          :new_table => true,
          :dataset => nil,
          :truncate => false,
          :destination_table => destination_table_name,
          :dataset_id => source_dataset.id,
          :workspace_id => workspace.id
      }
    end

    let(:start_time) { "2012-08-23 23:00:00.0" }

    let(:create_source_table) do
      gpdb1.exec_query("delete from #{source_table_name};")
    end

    def setup_data
      gpdb1.exec_query("insert into #{source_table_name}(id, name, id2, id3) values (1, 'marsbar', 3, 5);")
      gpdb1.exec_query("insert into #{source_table_name}(id, name, id2, id3) values (2, 'kitkat', 4, 6);")
      gpdb2.exec_query("drop table if exists #{destination_table_fullname};")
    end

    before do
      log_in user
      create_source_table

      stub(CrossDatabaseTableCopier).gpfdist_url { Socket.gethostname }
      stub(CrossDatabaseTableCopier).grace_period_seconds { 1 }
      setup_data
      # synchronously run all queued import jobs
      mock(QC.default_queue).enqueue_if_not_queued("ImportExecutor.run", anything) do |method, import_id|
        ImportExecutor.run import_id
      end
    end

    context 'running a scheduled import' do
      before do
        import_attributes.merge!(
            :import_type => 'schedule',
            :frequency => 'weekly',
            :start_datetime => start_time,
            :end_date => "2012-08-24")
      end

      it "copies data when the start time has passed" do
        Timecop.freeze(DateTime.parse(start_time) - 1.hour) do
          expect {
            post :create, import_attributes
          }.to change(Events::WorkspaceImportCreated, :count).by(1)
        end

        any_instance_of(Import) do |import|
          stub(import).tables_have_consistent_schema { true }
        end

        Timecop.freeze(DateTime.parse(start_time) + 1.day) do
          expect {
            ImportScheduler.run
          }.to change(Events::WorkspaceImportSuccess, :count).by(1)
        end
        check_destination_table
      end
    end

    after do
      gpdb2.exec_query("drop table if exists #{destination_table_fullname};")
      gpdb1.try(:disconnect!)
      gpdb2.try(:disconnect!)
      # We call src_schema from the test, although it is only called from run outside of tests, so we need to clean up
      #gp_pipe.src_conn.try(:disconnect!)
      #gp_pipe.dst_conn.try(:disconnect!)
    end

    def check_destination_table
      gpdb2.exec_query("SELECT * FROM #{destination_table_fullname}").length.should == 2
    end
  end
end
