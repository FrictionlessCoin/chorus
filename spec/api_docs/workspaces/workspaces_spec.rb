require 'spec_helper'

resource "Workspaces" do
  let(:workspace) { workspaces(:public) }
  let(:workspace_id) { workspace.to_param }
  let(:id) { workspace_id }
  let(:user) { workspace.owner }

  let(:gpdb_data_source) { database.data_source}
  let(:data_source_id) { gpdb_data_source.id }
  let(:database) { workspace.sandbox.database }
  let(:database_id) { database.id }
  let(:sandbox) { dataset.schema }
  let(:sandbox_id) { sandbox.id }
  let(:dataset) { datasets(:table) }
  let(:dataset_id) { dataset.to_param }

  before do
    log_in user
    stub(GpdbDataset).refresh.with_any_args { |account, schema, options| schema.datasets }
    stub(Alpine::API).delete_work_flow.with_any_args
  end

  get "/workspaces" do
    parameter :active, "true if you only want active workspaces, false if you want all workspaces. Defaults to all workspaces if the parameter is not provided"
    parameter :user_id, "If provided, only return workspaces the specified user is a member of"
    pagination

    example_request "Get a list of workspaces" do
      status.should == 200
    end
  end

  get "/workspaces/:id" do
    parameter :id, "Id of a workspace"

    required_parameters :id

    example_request "Get details for a workspace" do
      status.should == 200
    end
  end

  put "/workspaces/:id" do
    parameter :id, "Id of a workspace"
    parameter :name, "Name of workspace"
    parameter :public, "true if the workspace should be public, false if it should be private. Defaults to private if the parameter is not provided."
    parameter :summary, "Notes about the workspace"

    required_parameters :id

    let(:name) { "Awesome Workspace" }
    let(:public) { false }
    let(:summary) { "I like big data and I cannot lie, all the other coders can't deny" }

    example_request "Update workspace details" do
      status.should == 200
    end
  end

  post "/workspaces/:workspace_id/sandbox", :greenplum_integration do
    parameter :workspace_id, "Id of a workspace"
    parameter :data_source_id, "Id of a Greenplum data source to create new database in"
    parameter :database_name, "Name of a new database"
    parameter :schema_name, "Name of new schema"

    required_parameters :data_source_id, :database_name, :schema_name, :workspace_id

    let(:gpdb_data_source) { GreenplumIntegration.real_data_source }
    let(:database_name) { GreenplumIntegration.sandbox_created_db }
    let(:schema_name) { "a_new_schema_name" }
    let(:user) { gpdb_data_source.owner }

    before do
      gpdb_data_source.connect_with(gpdb_data_source.owner_account).execute("DROP DATABASE IF EXISTS #{database_name}")
    end

    example_request "Add a sandbox by creating a new schema in a new database" do
      status.should == 201
    end
  end

  post "/workspaces/:workspace_id/sandbox", :greenplum_integration do
    parameter :workspace_id, "Id of a workspace"
    parameter :data_source_id, "Id of the Greenplum data source to create a schema in"
    parameter :database_id, "Id of the database to create a schema in"
    parameter :schema_name, "Name of new schema"

    required_parameters :data_source_id, :database_id, :schema_name, :workspace_id

    let(:gpdb_data_source) { GreenplumIntegration.real_data_source }
    let(:database) { GreenplumIntegration.real_database }
    let(:schema_name) { "a_new_schema" }
    let(:user) { gpdb_data_source.owner }

    after do
      database.connect_with(gpdb_data_source.owner_account).drop_schema(schema_name)
    end

    example_request "Add a sandbox by creating a new schema in an existing database" do
      status.should == 201
    end
  end

  post "/workspaces/:workspace_id/sandbox" do
    parameter :workspace_id, "Id of a workspace"
    parameter :schema_id, "Id of the schema to add as a sandbox"

    required_parameters :schema_id, :workspace_id

    example_request "Add a sandbox schema that already exists" do
      status.should == 201
    end
  end

  post "/workspaces" do
    parameter :name, "Workspace name"
    parameter :public, "true if the workspace should be public, false if it should be private. Defaults to private if the parameter is not provided."
    parameter :summary, "Notes about the workspace"

    required_parameters :name

    let(:name) { "Awesome Workspace" }
    let(:public) { false }
    let(:summary) { "Lots of good data in here" }

    example_request "Create New Workspace" do
      status.should == 201
    end
  end

 delete "/workspaces/:id" do
    parameter :id, "Id of a workspace"

    required_parameters :id

    example_request "Delete a workspace" do
      status.should == 200
    end
  end

  delete "/workspaces/:workspace_id/quickstart" do
    parameter :workspace_id, "Id of a workspace"

    required_parameters :workspace_id
    example_request "Dismiss the quickstart for a workspace" do
      status.should == 200
    end
  end

  post "/workspaces/:workspace_id/external_tables" do
    parameter :hdfs_entry_id, "Id of the source HDFS file or directory"
    parameter :path_type, "Type of source for external table ['file' (default), 'pattern' or 'directory']"
    parameter :file_pattern, "Regular expression specifying file names to include (only when path_type is 'pattern')"
    parameter :'column_names[]', "Array of column names"
    parameter :'types[]', "Array of column types"
    parameter :delimiter, "Delimiter (i.e. , or ;)"
    parameter :table_name, "Name of the table to be created"
    parameter :workspace_id, "Id of the workspace to create the table in"

    required_parameters :hdfs_entry_id, :table_name, :workspace_id, :'column_names[]', :delimiter, :'types[]'

    let(:hdfs_entry_id) { hdfs_entries(:directory).id }
    let(:'column_names[]') { ["field1", "field2"] }
    let(:'types[]') { ["text", "text"] }
    let(:delimiter) { ',' }
    let(:table_name) { "highway_to_heaven" }

    before do
      workspace.update_attribute(:sandbox, sandbox)
      any_instance_of(ExternalTable) do |data_source|
        stub(data_source).save {
          sandbox.datasets << FactoryGirl.create(:gpdb_table, :schema => sandbox, :name => table_name)
        }
      end
    end

    example_request "Create external table from CSV file on hadoop" do
      status.should == 200
    end
  end
end
