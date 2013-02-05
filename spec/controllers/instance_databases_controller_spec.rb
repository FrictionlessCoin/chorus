require 'spec_helper'

describe InstanceDatabasesController do
  ignore_authorization!

  let(:user) { users(:owner) }

  before do
    log_in user
  end

  describe "#index" do
    it "fails when no such gpdb instance" do
      get :index, :data_source_id => 12345
      response.code.should == "404"
    end

    context "when the instance is accessible" do
      let(:gpdb_data_source) { data_sources(:shared) }
      let(:database) { gpdb_databases(:shared_database) }
      let(:database2) { gpdb_databases(:shared_database) }

      it "checks authorization" do
        stub(GpdbDatabase).refresh { [database] }
        mock(subject).authorize!(:show_contents, gpdb_data_source)
        get :index, :data_source_id => gpdb_data_source.id
      end

      context "when the refresh of the db fails" do
        before do
          stub(GpdbDatabase).refresh { raise ActiveRecord::JDBCError.new }
        end

        it "should fail" do
          get :index, :data_source_id => gpdb_data_source.id
          response.code.should == "422"
        end
      end

      context "when refresh of the db succeeds" do
        before do
          stub(GpdbDatabase).refresh { [database, database2] }
        end

        it "should succeed" do
          get :index, :data_source_id => gpdb_data_source.id
          response.code.should == "200"
          decoded_response[0].id.should == database.id
          decoded_response[0].instance.id.should == gpdb_data_source.id
          decoded_response.size.should == 2
        end

        it_behaves_like "a paginated list" do
          let(:params) {{ :data_source_id => gpdb_data_source.id }}
        end
      end
    end
  end

  describe "#show" do
    let(:database) { gpdb_databases(:default) }

    it "uses authorization" do
      mock(subject).authorize!(:show_contents, database.data_source)
      get :show, :id => database.to_param
    end

    it "renders the database" do
      get :show, :id => database.to_param
      response.code.should == "200"
      decoded_response.instance.id.should == database.data_source.id
      decoded_response.instance.name.should == database.data_source.name
      decoded_response.id.should == database.id
      decoded_response.name.should == database.name
    end

    generate_fixture "database.json" do
      get :show, :id => database.to_param
    end

    context "when the db can't be found" do
      it "returns 404" do
        get :show, :id => "-1"
        response.code.should == "404"
      end
    end

    context "when the current user does not have credentials for the instance" do
      let(:user) { users(:default) }
      subject { described_class.new }

      generate_fixture "forbiddenInstance.json" do
        get :show, :id => database.to_param
        response.should be_forbidden
      end
    end
  end
end
