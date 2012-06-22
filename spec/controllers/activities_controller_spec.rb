require "spec_helper"

describe ActivitiesController do
  let(:user) { FactoryGirl.create(:user) }
  let(:object) { FactoryGirl.build(:user) }

  let!(:activity1) { Activity.create!(:entity => object) }
  let!(:activity2) { Activity.create!(:entity => object) }
  let!(:dashboard_activity1) { Activity.create! }
  let!(:dashboard_activity2) { Activity.create! }

  let(:current_user) { FactoryGirl.create(:admin) }

  before do
    log_in current_user
    stub(Activity).for_dashboard_of(current_user) { fake_relation [dashboard_activity1, dashboard_activity2] }
  end

  describe "#index" do
    context "when getting the activities for an instance" do
      let(:object) { FactoryGirl.create(:instance) }

      it "presents the instance's activities" do
        mock_present { |models| models.should =~ [activity1, activity2] }
        get :index, :instance_id => object.id
      end
    end

    context "when getting the activities for a hadoop instance" do
      let(:object) { FactoryGirl.create(:hadoop_instance) }

      it "presents the hadoop instance's activities" do
        mock_present { |models| models.should =~ [activity1, activity2] }
        get :index, :hadoop_instance_id => object.id
      end
    end

    context "when getting the activities for a user" do
      let(:object) { FactoryGirl.create(:user) }

      it "presents the user's activities" do
        mock_present { |models| models.should =~ [activity1, activity2] }
        get :index, :user_id => object.id
      end
    end

    context "when getting the activities for a workfile" do
      let(:object) { FactoryGirl.create(:workfile) }

      it "presents the workfile's activities" do
        mock_present { |models| models.should =~ [activity1, activity2] }
        get :index, :workfile_id => object.id
      end
    end

    context "when getting the activities for the current user's home page" do
      it "presents the user's activities" do
        mock(Activity).for_dashboard_of(current_user) { fake_relation [dashboard_activity1, dashboard_activity2] }
        mock_present { |models| models.should =~ [dashboard_activity1, dashboard_activity2] }
        get :index
      end
    end
  end

  describe "#show" do
    it "show the particular activity ", :fixture => true do
      mock_present { |model| model.should == dashboard_activity1 }
      get :show, :id => dashboard_activity1.to_param
    end

    FIXTURE_FILES = {
      "greenplumInstanceCreated" => :greenplum_instance_created_event,
      "hadoopInstanceCreated" => :hadoop_instance_created_event,
      "greenplumInstanceChangedOwner" => :greenplum_instance_changed_owner_event,
      "greenplumInstanceChangedName" => :greenplum_instance_changed_name_event,
      "hadoopInstanceChangedName" => :hadoop_instance_changed_name_event,
      "workfileCreated" => :workfile_created_event
    }

    FIXTURE_FILES.each do |filename, event_factory_name|

      generate_fixture "activity/#{filename}.json" do
        event = FactoryGirl.create(event_factory_name)
        activity = Activity.global.create!(:event => event)
        get :show, :id => activity.to_param
      end

    end
  end
end
