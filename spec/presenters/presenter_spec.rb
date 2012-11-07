require 'spec_helper'

describe Presenter, :type => :view do
  before do
    @model = FactoryGirl.build :user
    @presenter = Presenter.new(@model, view)
  end

  describe "#model" do
    it "returns the model" do
      @presenter.model.should == @model
    end
  end

  describe ".present_collection" do
    it "serializes an array" do
      Presenter.present_collection([@model], view, {}).should be_a(Array)
    end
  end

  describe ".present" do
    let(:json) { Presenter.present(object_to_present, view) }

    context "with a single model" do
      let(:object_to_present) { FactoryGirl.build(:user) }

      it "passes its options on" do
        mock(Presenter).present_model(object_to_present, { view: true }, { test: true })
        Presenter.new(object_to_present, { view: true }).present(object_to_present, { test: true })
      end

      it "presents a hash of the model" do
        json[:username].should == object_to_present.username
      end

      context "when complete_json? is true" do
        before do
          any_instance_of(UserPresenter, :complete_json? => true)
        end

        it "includes complete json" do
          json[:complete_json].should be_true
        end
      end

      context "when complete_json? is false" do
        before do
          any_instance_of(UserPresenter, :complete_json? => false)
        end

        it "does not include complete json" do
          json.should_not have_key(:complete_json)
        end
      end
    end

    context "with a paperclip attachment" do
      it "creates an ImagePresenter" do
        mock.proxy(ImagePresenter).new(@model.image, view, {})
        Presenter.present(@model.image, view)
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
            FactoryGirl.build(:gpdb_instance, :name => 'gpdb_instance')
        ]
      end

      it "presents an array with a hash for each model" do
        json.length.should == 2
        json[0][:username].should == 'user'
        json[1][:name].should == 'gpdb_instance'
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

  describe "complete_json?" do
    it "is false by default" do
      @presenter.complete_json?.should be_false
    end
  end
end
