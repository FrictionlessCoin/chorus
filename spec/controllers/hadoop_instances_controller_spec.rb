require 'spec_helper'

describe HadoopInstancesController do
  ignore_authorization!

  before do
    @user = FactoryGirl.create :user
    log_in @user
  end

  describe "#create" do
    context "with valid attributes" do
      let(:valid_attributes) { Hash.new }

      before do
        instance = FactoryGirl.build(:hadoop_instance, :name => "new")
        stub(Hdfs::InstanceRegistrar).create!(valid_attributes, @user) { instance }
      end

      it "reports that the instance was created" do
        post :create, :hadoop_instance => valid_attributes
        response.code.should == "201"
      end

      it "renders the newly created instance" do
        post :create, :hadoop_instance => valid_attributes
        decoded_response.name.should == "new"
      end
    end

    context "with invalid attributes" do
      let(:invalid_attributes) { Hash.new }

      before do
        instance = FactoryGirl.build(:hadoop_instance, :name => nil)
        stub(Hdfs::InstanceRegistrar).create!(invalid_attributes, @user) { raise(ActiveRecord::RecordInvalid.new(instance)) }
      end

      it "responds with validation errors" do
        post :create, :hadoop_instance => invalid_attributes
        response.code.should == "422"
      end
    end
  end

  describe "#update" do
    context "with valid attributes" do
      let(:attributes) { { 'name' => 'new_name' } }
      let(:hadoop_instance) { FactoryGirl.create(:hadoop_instance) }

      before do
        mock(Hdfs::InstanceRegistrar).update!(hadoop_instance.id, attributes, @user)
      end

      it "uses authorization" do
        mock(subject).authorize!(:edit, hadoop_instance)
        put :update, :id => hadoop_instance.id, :hadoop_instance => attributes
      end

      it "responds with validation error" do
        put :update, :id => hadoop_instance.id, :hadoop_instance => attributes
        response.code.should == "200"
      end
    end

    context "with invalid attributes" do
      let(:invalid_attributes) { { 'name' => '' } }
      let(:hadoop_instance) { FactoryGirl.create(:hadoop_instance) }

      before do
        mock(Hdfs::InstanceRegistrar).update!(hadoop_instance.id, invalid_attributes, @user) do
          raise(ActiveRecord::RecordInvalid.new(hadoop_instance))
        end
      end

      it "responds with validation error" do
        put :update, :id => hadoop_instance.id, :hadoop_instance => invalid_attributes
        response.code.should == "422"
      end
    end
  end

  describe "#index" do
    it "presents all hadoop instances" do
      mock_present {|model| model.should =~ HadoopInstance.all}
      get :index
    end
  end

  describe "#show" do
    it "presents the hadoop instance with the given id" do
      instance = FactoryGirl.create(:hadoop_instance, :name => "hadoop3")
      get :show, :id => instance.id
      decoded_response.name.should == "hadoop3"
    end

    generate_fixture "hadoopInstance.json" do
      instance = FactoryGirl.create(:hadoop_instance, :name => "hadoop3")
      get :show, :id => instance.id
    end
  end
end
