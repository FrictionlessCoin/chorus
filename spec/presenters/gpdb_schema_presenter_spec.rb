require 'spec_helper'

describe GpdbSchemaPresenter, :type => :view do
  before(:each) do
    gpdb_instance = FactoryGirl.create(:gpdb_instance, :id => 123, :name => "instance1")
    database = FactoryGirl.create(:gpdb_database, :id => 789, :name => "db1", :gpdb_instance => gpdb_instance)
    schema = FactoryGirl.create(:gpdb_schema, :id => 456, :name => "abc", :database => database)
    FactoryGirl.create(:gpdb_table, :id => 1, :name => "table1", :schema => schema)
    FactoryGirl.create(:gpdb_view, :id => 2, :name => "view1", :schema => schema)
    schema.reload

    stub(ActiveRecord::Base).current_user { users(:owner) }

    @presenter = GpdbSchemaPresenter.new(schema, view)
  end

  describe "#to_hash" do
    before do
      @hash = @presenter.to_hash
    end

    it "includes the fields" do
      @hash[:id].should == 456
      @hash[:name].should == "abc"
      @hash[:has_credentials].should == false
      @hash[:dataset_count].should == 2
      database = @hash[:database]
      database[:id].should == 789
      database[:name].should == "db1"
      database[:instance][:id].should == 123
      database[:instance][:name].should == "instance1"
    end
  end
end
