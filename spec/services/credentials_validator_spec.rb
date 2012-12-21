require 'spec_helper'

describe CredentialsValidator do
  describe ".user" do
    it "returns the user" do
      user = stub
      stub(User).authenticate('a_username', 'a_password') { user }
      CredentialsValidator.user('a_username', 'a_password').should be(user)
    end

    it "raises an exception if the username is missing" do
      begin
        CredentialsValidator.user(nil, 'a_password')
        fail
      rescue CredentialsValidator::Invalid => e
        e.record.errors.get(:username).should == [[:blank, {}]]
      end
    end

    it "raises an exception if the password is missing" do
      begin
        CredentialsValidator.user('a_username', nil)
        fail
      rescue CredentialsValidator::Invalid => e
        e.record.errors.get(:password).should == [[:blank, {}]]
      end
    end

    it "raises an exception if the user cannot be authenticated" do
      begin
        stub(User).authenticate('a_username', 'a_password') { nil }
        CredentialsValidator.user('a_username', 'a_password')
        fail
      rescue CredentialsValidator::Invalid => e
        e.record.errors.get(:username_or_password).should == [[:invalid, {}]]
      end
    end

    context "when the LDAP switch is configured" do
      it "uses the LdapClient authentication" do
        user = FactoryGirl.create(:user)
        stub(LdapClient).enabled? { true }

        stub(LdapClient).authenticate(user.username, 'a_password') { true }
        CredentialsValidator.user(user.username, 'a_password').should == user
      end

      it "denies access with wrong LDAP credentials" do
        user = FactoryGirl.create(:user)
        stub(LdapClient).enabled? { true }
        stub(LdapClient).authenticate(user.username, 'a_password') { false }

        expect { CredentialsValidator.user(user.username, 'a_password') }.to raise_error(CredentialsValidator::Invalid)
      end

      context "admin logging in" do
        it "authenticates the edcadmin user with the in-database credentials" do
          edcadmin = FactoryGirl.create(:admin, :username => 'edcadmin')
          stub(LdapClient).enabled? { true }
          dont_allow(LdapClient).authenticate
          CredentialsValidator.user('edcadmin', edcadmin.password).should == edcadmin
        end

        it "authenticates the edcadmin user with invalid in-database credentials" do
          edcadmin = FactoryGirl.create(:admin, :username => 'edcadmin')
          stub(LdapClient).enabled? { true }
          dont_allow(LdapClient).authenticate
          expect { CredentialsValidator.user('edcadmin', "wrongpassword") }.to raise_error(CredentialsValidator::Invalid)
        end
      end
    end
  end
end
