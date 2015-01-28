require 'spec_helper'

describe User do
  before do
    stub(LdapClient).enabled? { false }
  end

  describe ".authenticate" do
    let(:user) { users(:default) }

    it "returns true if the password is correct" do
      User.authenticate(user.username, 'password').should be_true
    end

    it "returns false if the password is incorrect" do
      User.authenticate(user.username, 'bogus').should be_false
    end

    it "returns false if the user is deleted" do
      user.destroy
      User.authenticate(user.username, 'password').should be_false
    end

    it "is case insensitive" do
      User.authenticate(user.username.downcase, 'password').should be_true
      User.authenticate(user.username.upcase, 'password').should be_true
    end

    context "when there's a legacy_password_digest" do
      before do
        @user = FactoryGirl.build :user
        @user.password_digest = "XXXXXXXXXXXINVALIDXXXXXXX"
        @user.password_salt = ""
        @user.legacy_password_digest = Digest::SHA1.hexdigest("secret")
        @user.save!
      end

      it "authenticates" do
        User.authenticate(@user.username, 'secret').should be_true
      end

      it "rehashes the password as sha256" do
        user = User.authenticate(@user.username, 'secret')
        user.password_digest.should == Digest::SHA256.hexdigest('secret' + user.password_salt)
      end

      it "deletes the legacy_password_digest" do
        user = User.authenticate(@user.username, 'secret')
        user.legacy_password_digest.should be_blank
      end
    end
  end

  describe ".order" do
    it "sorts by first name, by default" do
      User.order(nil).to_a.should == User.all(:order => "LOWER(first_name), id").to_a
    end

    it "sorts by id as a secondary sort" do
      User.update_all(:first_name => 'billy')
      ids = User.order(nil).collect(&:id)
      ids.should == ids.sort
    end

    context "with a recognized sort order" do
      it "respects the sort order" do
        User.order("last_name").to_a.should == User.all(:order => "LOWER(last_name), id").to_a
      end
    end

    context "with an unrecognized sort order" do
      it "sorts by first name" do
        User.order("last_name; DROP TABLE users;").to_a.should == User.order("LOWER(first_name), id").to_a
      end
    end
  end

  describe "#accessible_events" do
    let(:owner) { users(:owner) }
    let(:data_source_event) { events(:owner_creates_gpdb_data_source) }
    let(:public_workspace_event) { events(:owner_creates_public_workspace) }
    let(:private_workspace_event) { events(:owner_creates_private_workspace) }
    let(:user_added_event) { events(:admin_creates_owner) }

    context "to members of a private workspace" do
      let(:current_user) { users(:the_collaborator) }

      it "returns all the events to a member of the private workspace" do
        owner.accessible_events(current_user).should include(data_source_event, public_workspace_event, private_workspace_event, user_added_event)
      end
    end

    context "to non-members of a private workspace" do
      let(:current_user) { users(:no_collaborators) }

      it "returns all the public events to a non-member of the private workspace" do
        owner.accessible_events(current_user).should include(data_source_event, public_workspace_event, user_added_event)
        owner.accessible_events(current_user).should_not include(private_workspace_event)
      end
    end
  end

  describe "validations" do
    let(:max_user_icon_size) {ChorusConfig.instance['file_sizes_mb']['user_icon']}

    it { should validate_presence_of :first_name }
    it { should validate_presence_of :last_name }
    it { should validate_presence_of :username }
    it { should validate_presence_of :email }
    it { should validate_attachment_size(:image).less_than(max_user_icon_size.megabytes) }
    it { should validate_with DeveloperCountValidator }
    it { should validate_with AdminCountValidator }
    it { should validate_with UserCountValidator }

    describe "field length" do
      it { should ensure_length_of(:username).is_at_most(256) }
      it { should ensure_length_of(:first_name).is_at_most(256) }
      it { should ensure_length_of(:last_name).is_at_most(256) }
      it { should ensure_length_of(:email).is_at_most(256) }
      it { should ensure_length_of(:title).is_at_most(256) }
      it { should ensure_length_of(:dept).is_at_most(256) }
      it { should ensure_length_of(:password).is_at_least(6) }
      it { should ensure_length_of(:password).is_at_most(256) }
      it { should ensure_length_of(:notes).is_at_most(4096) }
    end

    describe "username" do
      context "when no other user with that username exists" do
        it "validates" do
          FactoryGirl.build(:user, :username => "foo").should be_valid
        end
      end

      context "when another non-deleted user with that username exists" do
        before(:each) do
          FactoryGirl.create(:user, :username => "foo")
        end

        it "fails validation" do
          FactoryGirl.build(:user, :username => "foo").should_not be_valid
        end
      end

      context "when a deleted user with that username exists" do
        before(:each) do
          FactoryGirl.build(:user, :username => "foo", :deleted_at => Time.current)
        end

        it "validates" do
          FactoryGirl.build(:user, :username => "foo").should be_valid
        end
      end

      it "fails with invalid username" do
        FactoryGirl.build(:user, :username => "My Name Is Michael Cane").should_not be_valid
      end

      it "does not validate usernames when ldap is enabled" do
        stub(LdapClient).enabled? { true }
        FactoryGirl.build(:user, :username => "Pivotal User").should be_valid
      end

      it "allows a username of 256 characters" do
        expect { FactoryGirl.build(:user, :username => 'a' * 256).save! }.to change { User.count }.by(1)
      end
    end

    describe "password" do
      context "when ldap is enabled" do
        before do
          stub(LdapClient).enabled? { true }
        end

        it "is not required for any user" do
          user = FactoryGirl.build(:user, :password => nil, :password_digest => nil)
          user.should be_valid
        end
      end

      context "when legacy password exists" do
        it "is not required for any user" do
          user = FactoryGirl.build(:user, :password => nil, :legacy_password_digest => 'password-digest!')
          user.should be_valid
        end
      end

      context "when the password is not being modified" do
        it "is required if user does not have a saved password" do
          user = FactoryGirl.build(:user, :password_digest => nil, :password => nil)
          user.should validate_presence_of(:password)
        end

        it "is not required if user has a saved password" do
          user = FactoryGirl.build(:user, :password_digest => "1234", :password => nil)
          user.should be_valid
        end
      end

      context "when the password is being modified" do
        it { ensure_length_of(:password).is_at_least(6) }

        it "the password is updated" do
          @user = FactoryGirl.build :user, :username => 'jimmy'
          @user.save!

          @user.password = "654321"
          @user.save!
          User.named('jimmy').password_digest.should == Digest::SHA256.hexdigest("654321" + @user.password_salt)
        end
      end
    end

    context 'with user' do
      before do
        @user = FactoryGirl.create :user #, :username => 'aDmin'
      end

      describe "email" do
        it "should require a@b.c..." do
          @user.email = "abc"
          @user.should be_invalid
        end

        it "should accept + in the left-hand side of emails" do
          @user.email = "xyz+123@emc.com"
          @user.should be_valid
        end
      end

      describe "duplicate user names" do
        it "should be disallowed" do
          user2 = FactoryGirl.build(:user, :username => @user.username.upcase)
          user2.should_not be_valid
        end

        it "should be allowed when user name belongs to a deleted user" do
          @user.destroy
          user2 = FactoryGirl.build(:user, :username => @user.username)
          user2.should be_valid
        end
      end
    end
  end

  describe "image" do
    it "is /image/default-user.png by default" do
      user = FactoryGirl.build :user, :image => nil
      user.image.url.should == "/images/general/default-user.png"
    end
  end

  describe "associations" do
    it { should have_many(:gpdb_data_sources) }
    it { should have_many(:oracle_data_sources) }
    it { should have_many(:jdbc_data_sources) }
    it { should have_many(:data_source_accounts) }
    it { should have_many(:hdfs_data_sources) }
    it { should have_many(:workspaces) }
    it { should have_many(:owned_workspaces) }
    it { should have_many(:activities) }
    it { should have_many(:events) }
    it { should have_many(:dashboard_items).dependent(:destroy) }
  end

  describe ".admin_count" do
    it "returns the number of admins that exist" do
      User.admin_count.should == User.where(:admin => true).count
    end
  end

  describe "#admin=" do
    let(:admin) { users(:admin) }

    it "allows an admin to remove their own privileges, if there are other admins" do
      admin.admin = false
      admin.should_not be_admin
    end

    it "does not allow an admin to remove their own privileges if there are no other admins" do
      users(:evil_admin).delete
      admin.admin = false
      admin.should be_admin
    end
  end

  describe '.developer_count' do
    it 'returns the number of developers that exist' do
      User.developer_count.should == User.where(:developer => true).count
    end
  end

  describe ".create" do
    it "should ignore fields that aren't in the model" do
      @user = User.create :bogus => 'field', :username => 'aDmin2', :password => 'secret', :first_name => "Jeau", :last_name => "Bleau", :email => "jb@emc.com"
      @user.should be_valid
      lambda { @user.bogus }.should raise_error
    end

    it "should create a random password salt" do
      user = User.create :bogus => 'field', :username => 'aDmin2', :password => 'secret', :first_name => "Jeau", :last_name => "Bleau", :email => "jb@emc.com"
      user.password_salt.should_not be_blank
    end

    describe "when creating a second user with the same password" do
      it "has a different password digest" do
        @user = User.create :bogus => 'field', :username => 'aDmin2', :password => 'secret', :first_name => "Jeau", :last_name => "Bleau", :email => "jb@emc.com"
        @another_user = User.create :bogus => 'field', :username => 'hacker_guy', :password => 'secret', :first_name => "Jeau", :last_name => "Bleau", :email => "jb@emc.com"
        @another_user.password_digest.should_not equal(@user.password_digest)
      end
    end
  end

  describe "#destroy" do
    let(:user) { users(:default) }

    it "fails for a user who owns a data source" do
      user.gpdb_data_sources << FactoryGirl.build(:gpdb_data_source, :owner => user)
      expect { user.destroy }.to raise_error(ActiveRecord::RecordInvalid)
      user.should have_error_on(:user).with_message(:nonempty_data_source_list)
    end

    it "does not allow deleting a user who owns a workspace" do
      workspace = FactoryGirl.create(:workspace)
      expect { workspace.owner.destroy}.to raise_exception(ActiveRecord::RecordInvalid)
      workspace.owner.should have_error_on(:workspace_count).with_message(:equal_to).with_options(:count => 0)
    end

    it "deletes associated memberships" do
      workspace = workspaces(:public)
      workspace.members << user
      expect {
        user.destroy
      }.to change(workspace.members, :count).by(-1)
    end

    it "deletes associated data source accounts" do
      user = users(:the_collaborator)
      user.data_source_accounts.count.should be > 0
      expect {
        user.destroy
      }.to change { DataSourceAccount.where(owner_id: user.id).count }.to(0)
    end

    it 'updates job ownership to the owner of the workspace containing the job' do
      user = users(:the_collaborator)
      FactoryGirl.create(:job, :workspace => user.workspaces.first, :owner => user)
      Job.where(:owner_id => user.id).count.should > 0
      expect {
        user.destroy
      }.to change { Job.where(:owner_id => user.id).count }.to(0)
    end
  end

  describe "search fields" do
    it "indexes text fields" do
      User.should have_searchable_field :first_name
      User.should have_searchable_field :last_name
      User.should have_searchable_field :username
      User.should have_searchable_field :email
    end
  end

  describe "#accessible_account_ids" do
    it "includes the users individual data source accounts plus all shared data source accounts" do
      user = users(:owner)
      shared_ids = DataSourceAccount.joins(:data_source).where('data_sources.shared = true').collect(&:id)
      user_ids = user.data_source_account_ids
      user.accessible_account_ids.should =~ (shared_ids + user_ids).uniq
    end
  end

  it { should have_attached_file(:image) }

  it_should_behave_like "taggable models", [:users, :default]

  it_behaves_like 'a soft deletable model' do
    let(:model) { users(:default) }
  end
end
