require 'spec_helper'

describe WorkfileMigrator, :legacy_migration => true, :type => :legacy_migration do
  describe ".migrate" do
    before do
      UserMigrator.new.migrate
      WorkspaceMigrator.new.migrate
      MembershipMigrator.new.migrate
    end

    describe "validate the number of entries copied" do
      it "creates a workfile for every legacy workfile, including deleted ones" do
        legacy_workfiles = Legacy.connection.select_all("select * from edc_work_file")
        expect { WorkfileMigrator.new.migrate }.to change(Workfile.unscoped, :count).by(legacy_workfiles.length)
      end

      it "creates a workfile draft for every legacy draft, including deleted ones" do
        legacy_drafts = Legacy.connection.select_all("select * from edc_workfile_draft WHERE is_deleted = 'f'")
        expect { WorkfileMigrator.new.migrate }.to change(WorkfileDraft, :count).by(legacy_drafts.length)
      end

      it "creates a workfile version for every legacy version, including deleted ones" do
        legacy_versions = Legacy.connection.select_all("select * from edc_workfile_version")
        expect { WorkfileMigrator.new.migrate }.to change(WorkfileVersion.unscoped, :count).by(legacy_versions.length)
      end
    end

    describe "copying the data" do
      before do
        WorkfileMigrator.new.migrate
        @legacy_workfiles = Legacy.connection.select_all("select * from edc_work_file")
        @legacy_drafts = Legacy.connection.select_all("select * from edc_workfile_draft WHERE is_deleted = 'f'")
        @legacy_versions = Legacy.connection.select_all("select * from edc_workfile_version")
      end

      it "saves the id of the new workfile on the legacy workfile" do
        @legacy_workfiles.each do |legacy_workfile|
          id = legacy_workfile["chorus_rails_workfile_id"]
          id.should be_present
          Workfile.find_with_destroyed(id).should be_present
        end
      end

      it "associates new workfiles with the appropriate workspace" do
        @legacy_workfiles.each do |legacy_workfile|
          legacy_workspace = Legacy.connection.select_one("select * from edc_workspace where id = '#{legacy_workfile["workspace_id"]}'")
          new_workfile = Workfile.find_with_destroyed(legacy_workfile["chorus_rails_workfile_id"])
          new_workfile.workspace.id.should == legacy_workspace["chorus_rails_workspace_id"].to_i
        end
      end

      it "associates new workfiles with the appropriate owner" do
        @legacy_workfiles.each do |legacy_workfile|
          legacy_owner = Legacy.connection.select_one("select * from edc_user where user_name = '#{legacy_workfile["owner"]}'")
          new_workfile = Workfile.find_with_destroyed(legacy_workfile["chorus_rails_workfile_id"])
          new_workfile.owner.id.should == legacy_owner["chorus_rails_user_id"].to_i
        end
      end

      it "copies the interesting fields" do
        @legacy_workfiles.each do |legacy_workfile|
          new_workfile = Workfile.find_with_destroyed(legacy_workfile["chorus_rails_workfile_id"])
          new_workfile.description.should == legacy_workfile["description"]
          new_workfile.file_name.should == legacy_workfile["file_name"]
          new_workfile.created_at.should == DateTime.parse(legacy_workfile["created_stamp"])
          new_workfile.updated_at.should == DateTime.parse(legacy_workfile["last_updated_stamp"])
        end
      end

      it "copies the deleted flag" do
        @legacy_workfiles.each do |legacy_workfile|
          new_workfile = Workfile.find_with_destroyed(legacy_workfile["chorus_rails_workfile_id"])
          if legacy_workfile["is_deleted"] == 't'
            new_workfile.deleted_at.should == legacy_workfile["last_updated_stamp"]
          elsif legacy_workfile["is_deleted"] == 'f'
            new_workfile.deleted_at.should be_nil
          else
            fail "Unrecognized workfile state"
          end
        end
      end

      describe "versions" do
        it "migrates all versions from the legacy database" do
          @legacy_workfiles.each do |legacy_workfile|
            new_workfile = Workfile.find_with_destroyed(legacy_workfile["chorus_rails_workfile_id"])
            legacy_versions = Legacy.connection.select_all("select * from edc_workfile_version WHERE workfile_id = '#{legacy_workfile["id"]}'")
            new_workfile.versions.count.should == legacy_versions.length
          end
        end

        it "saves the id of the new workfile version on the legacy workfile version" do
          legacy_versions = Legacy.connection.select_all("select * from edc_workfile_version WHERE is_deleted = 'f'")
          legacy_versions.each do |legacy_version|
            legacy_version["chorus_rails_workfile_version_id"].should be_present
          end
        end

        it "associates new versions with the appropriate workfile" do
          @legacy_versions.each do |legacy_version|
            legacy_workfile = Legacy.connection.select_one("select * from edc_work_file where id = '#{legacy_version["workfile_id"]}'")
            new_workfile = Workfile.find_with_destroyed(legacy_workfile["chorus_rails_workfile_id"])
            new_version = WorkfileVersion.find(legacy_version["chorus_rails_workfile_version_id"])
            new_version.workfile.id.should == legacy_workfile["chorus_rails_workfile_id"].to_i
          end
        end

        it "associates the new version with the appropriate owner and modifier" do
          @legacy_versions.each do |legacy_version|
            legacy_owner = Legacy.connection.select_one("select * from edc_user where user_name = '#{legacy_version["version_owner"]}'")
            legacy_modifier = Legacy.connection.select_one("select * from edc_user where user_name = '#{legacy_version["modified_by"]}'")

            new_owner = User.find(legacy_owner["chorus_rails_user_id"])
            new_modifier = User.find(legacy_modifier["chorus_rails_user_id"])

            new_version = WorkfileVersion.find(legacy_version["chorus_rails_workfile_version_id"])

            new_version.owner_id.should == new_owner.id
            new_version.modifier_id.should == new_modifier.id
          end
        end

        it "copies the interesting fields" do
          @legacy_versions.each do |legacy_version|
            new_version = WorkfileVersion.find(legacy_version["chorus_rails_workfile_version_id"])
            new_version.commit_message.should == legacy_version["commit_message"]
            new_version.version_num.should == legacy_version["version_num"].to_i
            new_version.created_at.should == DateTime.parse(legacy_version["created_stamp"])
            new_version.updated_at.should == DateTime.parse(legacy_version["last_updated_stamp"])
          end
        end

        it "attaches the legacy workfile version content to the new workfile version model" do
          @legacy_versions.each do |legacy_version|
            new_version = WorkfileVersion.find(legacy_version["chorus_rails_workfile_version_id"])
            new_version.contents_file_name.should be_present
          end
        end
      end

      describe "draft" do
        it "migrates non-deleted drafts" do
          @legacy_workfiles.each do |legacy_workfile|
            new_workfile = Workfile.find_with_destroyed(legacy_workfile["chorus_rails_workfile_id"])
            legacy_drafts = Legacy.connection.select_all("select * from edc_workfile_draft WHERE workfile_id = '#{legacy_workfile["id"]}' AND is_deleted = 'f'")
            new_workfile.drafts.count.should == legacy_drafts.length
          end
        end

        it "saves the id of the new workfile draft on the legacy workfile draft" do
          legacy_drafts = Legacy.connection.select_all("select * from edc_workfile_draft WHERE is_deleted = 'f'")
          legacy_drafts.each do |legacy_draft|
            legacy_draft["chorus_rails_workfile_draft_id"].should be_present
          end
        end

        it "associates new drafts with the appropriate workfile" do
          @legacy_drafts.each do |legacy_draft|
            legacy_workfile = Legacy.connection.select_one("select * from edc_work_file where id = '#{legacy_draft["workfile_id"]}'")
            new_draft = WorkfileDraft.find(legacy_draft["chorus_rails_workfile_draft_id"])
            new_draft.workfile.id.should == legacy_workfile["chorus_rails_workfile_id"].to_i
          end
        end

        it "associates the new draft with the appropriate owner" do
          @legacy_drafts.each do |legacy_draft|
            legacy_owner = Legacy.connection.select_one("select * from edc_user where user_name = '#{legacy_draft["draft_owner"]}'")
            new_owner = User.find(legacy_owner["chorus_rails_user_id"])
            new_draft = WorkfileDraft.find(legacy_draft["chorus_rails_workfile_draft_id"])
            new_draft.owner_id.should == new_owner.id
          end
        end

        it "copies the interesting fields" do
          @legacy_drafts.each do |legacy_draft|
            new_draft = WorkfileDraft.find(legacy_draft["chorus_rails_workfile_draft_id"])
            new_draft.base_version.should == legacy_draft["base_version_num"].to_i
            new_draft.created_at.should == DateTime.parse(legacy_draft["created_stamp"])
            new_draft.updated_at.should == DateTime.parse(legacy_draft["last_updated_stamp"])
          end
        end

        it "attaches the legacy workfile draft content to the new workfile draft model" do
          @legacy_drafts.each do |legacy_draft|
            new_draft = WorkfileDraft.find(legacy_draft["chorus_rails_workfile_draft_id"])
            new_draft.content.should be_present
          end
        end
      end
    end
  end
end
