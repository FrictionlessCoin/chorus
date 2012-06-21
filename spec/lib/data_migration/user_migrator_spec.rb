require 'spec_helper'

describe UserMigrator, :data_migration => true do
  describe ".migrate" do
    describe "the new foreign key column" do
      before(:each) do
        Legacy.connection.column_exists?(:edc_user, :chorus_rails_user_id).should be_false
      end

      it "adds the new foreign key column" do
        UserMigrator.new.migrate
        Legacy.connection.column_exists?(:edc_user, :chorus_rails_user_id).should be_true
      end
    end

    describe "copying the data" do
      before do
        UserMigrator.new.migrate
      end
      it "creates new users for legacy users" do
        User.find_with_destroyed(:all).length.should == 8
      end

      it "copies the correct data fields from the legacy user" do
        Legacy.connection.select_all("SELECT * FROM edc_user").each do |legacy_user|
          user = User.find_with_destroyed(legacy_user["chorus_rails_user_id"])
          user.should be_present
          user.username.should == legacy_user["user_name"]
          user.first_name.should == legacy_user["first_name"]
          user.last_name.should == legacy_user["last_name"]
          legacy_user["password"].should == "{SHA}#{user.password_digest}"
          user.email.should == legacy_user["email_address"]
          user.title.should == legacy_user["title"]
          user.dept.should == legacy_user["ou"]
          user.notes.should == legacy_user["notes"]
          if legacy_user["is_deleted"] == "f"
            user.deleted_at.should be_nil
          else
            user.deleted_at.should == legacy_user["last_updated_tx_stamp"]
          end
          user.updated_at.should == legacy_user["last_updated_tx_stamp"]
          user.created_at.should == legacy_user["created_tx_stamp"]
        end
      end

      it "sets the correct password" do
        User.authenticate("edcadmin", "secret").should be_true
      end
    end
  end
end