require "spec_helper"

describe GpdbSchemaFunctionPresenter, :type => :view do
  let(:gpdb_schema_function) { GpdbSchemaFunction.new("a_schema", "hello", "sql", "int4", "{arg1}", ["text"], "Hi!!!", "awesome") }

  subject { GpdbSchemaFunctionPresenter.new(gpdb_schema_function, view)}

  describe "#to_hash" do
    it "includes basic information" do
      hash = subject.to_hash
      hash[:schema_name].should == "a_schema"
      hash[:name].should == "hello"
      hash[:language].should == "sql"
      hash[:return_type].should == "int4"
      hash[:arg_names].should == ["arg1"]
      hash[:arg_types].should == ["text"]
      hash[:definition].should == "Hi!!!"
      hash[:description].should == "awesome"
    end
  end
end