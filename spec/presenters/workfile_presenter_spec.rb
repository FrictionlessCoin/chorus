require 'spec_helper'

describe WorkfilePresenter, :type => :view do
  let(:user) { users(:owner) }
  let(:workfile) { workfiles(:private) }
  let(:workspace) { workfile.workspace }
  let(:options) { {} }
  let(:presenter) { WorkfilePresenter.new(workfile, view, options) }

  before(:each) do
    stub(ActiveRecord::Base).current_user { user }
  end

  describe "#to_hash" do
    let(:hash) { presenter.to_hash }

    it "includes the right keys" do
      hash.should have_key(:workspace)
      hash.should have_key(:owner)

      hash.should have_key(:file_name)
      hash.should have_key(:file_type)
      hash.should have_key(:latest_version_id)
      hash.should have_key(:has_draft)
      hash.should have_key(:is_deleted)
      hash.should_not have_key(:execution_schema)
    end

    it "uses the workspace presenter to serialize the workspace" do
      hash[:workspace].to_hash.should == (WorkspacePresenter.new(workspace, view).presentation_hash)
    end

    it "uses the user presenter to serialize the owner" do
      hash[:owner].to_hash.should == (UserPresenter.new(user, view).presentation_hash)
    end

    it "uses the workfile file name" do
      hash[:file_name].should == workfile.file_name
    end

    context "workfile has a draft for that user" do
      it "has_draft value is true" do
        FactoryGirl.create(:workfile_draft, :workfile_id => workfile.id, :owner_id => user.id)
        hash = presenter.to_hash
        hash[:has_draft].should == true
      end
    end

    context "No workfile draft for that user" do
      it "has_draft value is false" do
        hash[:has_draft].should == false
      end
    end

    context ":include_execution_schema is passed as an option" do
      let(:presenter) { WorkfilePresenter.new(workfile, view, :include_execution_schema => true) }

      it "includes the execution_schema" do
        hash[:execution_schema].should == GpdbSchemaPresenter.new(workfile.execution_schema, view).presentation_hash
      end
    end

    it "sanitizes file name" do
      bad_value = 'file_ending_in_invalid_quote"'
      workfile = FactoryGirl.create(:workfile)
      workfile_version = FactoryGirl.create(:workfile_version, :contents => test_file(bad_value), :workfile => workfile)
      json = WorkfilePresenter.new(workfile, view).to_hash

      json[:file_name].should_not include '"'
    end

    context "for activity stream" do
      let(:options) { {:activity_stream => true} }

      it "should not include owner or draft status" do
        hash[:owner].should be_nil
        hash[:has_draft].should be_nil
      end
    end
  end

  describe "complete_json?" do
    context "when not including execution schema" do
      it "is not true" do
        presenter.complete_json?.should_not be_true
      end
    end

    context "when including execution schema" do
      let(:options) { {:include_execution_schema => true, :activity_stream => activity_stream} }

      context "when rendering activity stream" do
        let(:activity_stream) { true }
        it "should be false" do
          presenter.should_not be_complete_json
        end
      end

      context "when not rendering for activity stream" do
        let(:activity_stream) { false }
        it "is true" do
          presenter.complete_json?.should be_true
        end
      end
    end
  end
end
