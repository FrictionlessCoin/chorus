require 'spec_helper'

describe Workfile do
  describe "validations" do
    context "file name with valid characters" do
      it "is valid" do
        workfile = Workfile.new :file_name => 'work_(-file).sql'

        workfile.should be_valid
      end
    end

    context "file name with question mark" do
      it "is not valid" do
        workfile = Workfile.new :file_name => 'workfile?.sql'

        workfile.should_not be_valid
        workfile.errors[:file_name].should_not be_empty
      end
    end

    context "normalize the file name" do
      let!(:another_workfile) { FactoryGirl.create(:workfile, :file_name => 'workfile.sql') }

      context "first conflict" do
        it "renames and turns the workfile valid" do
          workfile = Workfile.new(:versions_attributes => [{:contents => test_file("workfile.sql", "text/sql")}])
          workfile.workspace = another_workfile.workspace
          workfile.owner = another_workfile.owner

          workfile.should be_valid
          workfile.file_name.should == 'workfile_1.sql'
        end
      end

      context "multiple conflicts" do
        let(:workspace) { FactoryGirl.create(:workspace) }
        let!(:another_workfile_1) { FactoryGirl.create(:workfile, :workspace => workspace, :file_name => 'workfile.sql') }
        let!(:another_workfile_2) { FactoryGirl.create(:workfile, :workspace => workspace, :file_name => 'workfile.sql') }

        it "increases the version number" do
          workfile = Workfile.new :file_name => 'workfile.sql'
          workfile.workspace = workspace
          workfile.owner = another_workfile_1.owner

          workfile.save
          workfile.should be_valid
          workfile.file_name.should == 'workfile_2.sql'
        end
      end
    end
  end

  describe ".validate_name_uniqueness" do
    let!(:workspace) { FactoryGirl.create(:workspace) }
    let!(:other_workspace) { FactoryGirl.create(:workspace) }
    let!(:existing_workfile) { FactoryGirl.create(:workfile, :workspace => workspace, :file_name => 'workfile.sql') }

    it "returns false and adds an error to the error list if name in workspace is taken" do
      new_workfile = Workfile.new :file_name => 'workfile.sql'
      new_workfile.workspace = workspace
      new_workfile.validate_name_uniqueness.should be_false
      new_workfile.errors[:file_name].should_not be_empty
    end

    it "returns true if there are no conflicts in its own workspace" do
      new_workfile = Workfile.new :file_name => 'workfile.sql'
      new_workfile.workspace = other_workspace
      new_workfile.validate_name_uniqueness.should be_true
      new_workfile.errors[:file_name].should be_empty
    end
  end

  describe ".create_from_file_upload" do
    let(:user) { users(:admin) }
    let(:workspace) { workspaces(:public_with_no_collaborators) }


    shared_examples "file upload" do
      it "creates a workfile in the database" do
        subject.should be_valid
        subject.should be_persisted
      end

      it "creates a workfile version in the database" do
        subject.versions.should have(1).version

        version = subject.versions.first
        version.should be_valid
        version.should be_persisted
      end

      it "sets the attributes of the workfile" do
        subject.owner.should == user
        subject.file_name.should == 'workfile.sql'
        subject.workspace.should == workspace
      end

      it "has a valid latest version" do
        subject.latest_workfile_version.should_not be_nil
      end

      it "sets the modifier of the first, recently created version" do
        subject.versions.first.modifier.should == user
      end

      it "sets the attributes of the workfile version" do
        version = subject.versions.first

        version.contents.should be_present
        version.version_num.should == 1
      end

      it "does not set a commit message" do
        subject.versions.first.commit_message.should be_nil
      end
    end

    context "with versions" do
      let(:attributes) do
        {
          :description => "Nice workfile, good workfile, I've always wanted a workfile like you",
          :versions_attributes => [{
                                     :contents => test_file('workfile.sql')
                                   }]
        }
      end

      subject { described_class.create_from_file_upload(attributes, workspace, user) }

      it_behaves_like "file upload"

      it "sets the content of the workfile" do
        subject.versions.first.contents.size.should > 0
      end

      it "sets the right description on the workfile" do
        subject.description.should == "Nice workfile, good workfile, I've always wanted a workfile like you"
      end
    end

    context "without a version" do
      subject { described_class.create_from_file_upload({:file_name => 'workfile.sql'}, workspace, user) }

      it_behaves_like "file upload"

      it "sets the file as blank" do
        subject.versions.first.contents.size.should == 0
        subject.versions.first.file_name.should == 'workfile.sql'
      end
    end

    context "with an image extension on a non-image file" do
      let(:attributes) do
        {
          :versions_attributes => [{
                                     :contents => test_file('not_an_image.jpg')
                                   }]
        }
      end

      it "throws an exception" do
        expect { described_class.create_from_file_upload(attributes, workspace, user) }.to raise_error(ActiveRecord::RecordInvalid)
      end

      it "does not create a orphan workfile" do
        expect do
          begin
            described_class.create_from_file_upload(attributes, workspace, user)
          rescue Exception => e
          end
        end.to_not change(Workfile, :count)
      end
    end
  end

  describe ".create_from_svg" do
    let(:user) { users(:admin) }
    let(:workspace) { workspaces(:public_with_no_collaborators) }
    let(:filename) { 'svg_img.png' }
    subject { described_class.create_from_svg({:svg_data => '<svg xmlns="http://www.w3.org/2000/svg"></svg>', :file_name => filename}, workspace, user) }

    it "should make a new workfile with the initial version set to the image generated by the SVG data" do
      subject.versions.first.contents.size.should_not == 0
      subject.versions.first.file_name.should == filename
    end

    it "creates a workfile in the database" do
      subject.should be_valid
      subject.should be_persisted
    end

    it "creates a workfile version in the database" do
      subject.versions.should have(1).version

      version = subject.versions.first
      version.should be_valid
      version.should be_persisted
    end

    it "sets the attributes of the workfile" do
      subject.owner.should == user
      subject.file_name.should == filename
      subject.workspace.should == workspace
    end

    it "has a valid latest version" do
      subject.latest_workfile_version.should_not be_nil
    end

    it "sets the modifier of the first, recently created version" do
      subject.versions.first.modifier.should == user
    end

    it "sets the attributes of the workfile version" do
      version = subject.versions.first

      version.contents.should be_present
      version.version_num.should == 1
    end

    it "does not set a commit message" do
      subject.versions.first.commit_message.should be_nil
    end
  end

  describe "#build_new_version" do

    let(:user) { users(:owner) }
    let(:workspace) { FactoryGirl.build(:workspace, :owner => user) }
    let(:workfile) { FactoryGirl.build(:workfile, :workspace => workspace, :file_name => 'workfile.sql') }

    context "when there is a previous version" do
      let(:workfile_version) { FactoryGirl.build(:workfile_version, :workfile => workfile) }

      before do
        workfile_version.contents = test_file('workfile.sql')
        workfile_version.save
      end

      it "build a new version with version number increased by 1 " do
        workfile_version = workfile.build_new_version(user, test_file('workfile.sql'), "commit Message")
        workfile_version.version_num.should == 2
        workfile_version.commit_message.should == "commit Message"
        workfile_version.should_not be_persisted
      end
    end

    context "creating the first version" do
      it "build a version with version number as 1" do
        workfile_version = workfile.build_new_version(user, test_file('workfile.sql'), "commit Message")
        workfile_version.version_num.should == 1
        workfile_version.commit_message.should == "commit Message"
        workfile_version.should_not be_persisted
      end
    end
  end

  describe "#has_draft" do
    let(:workspace) { workspaces(:public) }
    let(:user) { workspace.owner }
    let!(:workfile1) { FactoryGirl.create(:workfile, :file_name => "some.txt", :workspace => workspace) }
    let!(:workfile2) { FactoryGirl.create(:workfile, :file_name => "workfile.sql", :workspace => workspace) }
    let!(:draft) { FactoryGirl.create(:workfile_draft, :workfile_id => workfile1.id, :owner_id => user.id) }

    it "has_draft return true for workfile1" do
      workfile1.has_draft(user).should == true
    end

    it "has_draft return false for workfile2" do
      workfile2.has_draft(user).should == false
    end
  end

  describe "associations" do
    it { should belong_to :owner }
    it { should have_many :activities }
    it { should have_many :events }
    it { should have_many :notes }
    it { should have_many :comments_on_notes }

    it "belongs to an execution_schema" do
      workfile = workfiles(:private)
      workfile.execution_schema.should be_a GpdbSchema
    end

    describe "#notes" do
      let(:workfile) { workfiles(:private) }
      let(:author) { workfile.owner }

      it "should return notes" do
        note = Events::NoteOnWorkfile.by(author).add(:workfile => workfile, :body => "note on a workfile", :workspace => workfile.workspace)
        workfile.reload
        workfile.notes.first.should be_a(Events::NoteOnWorkfile)
        workfile.notes.should == [note]
      end
    end
  end

  describe "search fields" do
    it "indexes text fields" do
      Workfile.should have_searchable_field :file_name
      Workfile.should have_searchable_field :description
    end
  end
end
