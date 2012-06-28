require 'spec_helper'

describe Presenter, :type => :view do
  before do
    @user = FactoryGirl.build :user
    @presenter = Presenter.new(@user, view)
  end

  describe "#model" do
    it "returns the model" do
      @presenter.model.should == @user
    end
  end

  describe ".present_collection" do
    it "serializes an array" do
      Presenter.present_collection([@user], view, {}).should be_a(Array)
    end
  end

  describe ".present" do
    let(:json) { Presenter.present(object_to_present, view) }

    context "with a single model" do
      let(:object_to_present) { FactoryGirl.build(:user) }

      it "presents a hash of the model" do
        json[:username].should == object_to_present.username
      end
    end

    context "with a paperclip attachment" do
      it "creates an ImagePresenter" do
        mock.proxy(ImagePresenter).new(@user.image, view, {})
        Presenter.present(@user.image, view)
      end
    end

    context "with a subclass of Events::Base" do
      it "creates an EventPresenter" do
        event = FactoryGirl.build(:greenplum_instance_created_event)
        mock.proxy(EventPresenter).new(event, view, {})
        Presenter.present(event, view)
      end
    end

    context "with an active record relation" do
      before do
        FactoryGirl.create(:admin)
        FactoryGirl.create(:admin)
      end

      let(:object_to_present) { User.where(:admin => true) }

      it "presents an array with a hash for each model in the relation" do
        json.length.should == 2
        json[0][:id].should == object_to_present[0].id
        json[1][:id].should == object_to_present[1].id
      end
    end

    context "with an array of models" do
      let(:object_to_present) do
        [
            FactoryGirl.build(:user, :username => 'name1'),
            FactoryGirl.build(:user, :username => 'name2')
        ]
      end

      it "presents an array with a hash for each model" do
        json.length.should == 2
        json[0][:username].should == object_to_present[0].username
        json[1][:username].should == object_to_present[1].username
      end
    end

    context "with a heterogeneous list of models" do
      let(:object_to_present) do
        [
            FactoryGirl.build(:user, :username => 'user'),
            FactoryGirl.build(:instance, :name => 'instance')
        ]
      end

      it "presents an array with a hash for each model" do
        json.length.should == 2
        json[0][:username].should == 'user'
        json[1][:name].should == 'instance'
      end
    end

    context "with an empty relation" do
      let(:object_to_present) { User.where(:username => "not_real") }

      it "presents an empty array" do
        json.should == []
      end
    end

    context "with an empty array" do
      let(:object_to_present) { [] }

      it "presents an empty array" do
        json.should == []
      end
    end
  end
end
