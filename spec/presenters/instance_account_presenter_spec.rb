require 'spec_helper'

describe InstanceAccountPresenter, :type => :view do
  before do
    @user = FactoryGirl.create :user

    @gpdb_instance = FactoryGirl.create :gpdb_instance
    @gpdb_instance.owner = @user

    @account = FactoryGirl.create :instance_account
    @account.owner = @user
    @account.gpdb_instance = @gpdb_instance

    @presenter = InstanceAccountPresenter.new(@account, view)
  end

  describe "#to_hash" do
    before do
      @hash = @presenter.to_hash
    end

    it "includes the right keys and values" do
      @hash[:id].should == @account.id
      @hash[:owner_id].should == @user.id
      @hash[:instance_id].should == @gpdb_instance.id
      @hash[:db_username].should == @account[:db_username]
    end

    it "should use ownerPresenter Hash method for owner" do
      @owner = @hash[:owner]
      @owner.to_hash.should == (UserPresenter.new(@user, view).presentation_hash)
    end
  end
end