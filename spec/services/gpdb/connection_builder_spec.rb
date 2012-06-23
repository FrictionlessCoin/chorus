require 'spec_helper'

describe Gpdb::ConnectionBuilder do
  let(:instance) { FactoryGirl::create :instance, :host => "hello" }
  let(:instance_account) { FactoryGirl::create :instance_account, :db_username => "user1", :db_password => "pw1" }
  let(:fake_connection_adapter) { stub(Object.new).disconnect!.subject }

  let(:expected_connection_params) do
    {
      host: instance.host,
      port: instance.port,
      database: expected_database,
      username: instance_account.db_username,
      password: instance_account.db_password,
      adapter: "jdbcpostgresql"
    }
  end

  let(:expected_database) { instance.maintenance_db }

  before do
    mock(ActiveRecord::Base).postgresql_connection(expected_connection_params) { fake_connection_adapter }
  end

  describe "#connect!" do
    context "when a database name is passed" do
      let(:expected_database) { "john_the_database" }

      it "connections to the given database and instance, with the given account" do
        Gpdb::ConnectionBuilder.connect!(instance, instance_account, "john_the_database")
      end
    end

    context "when no database name is passed" do
      it "connects to the given instance's 'maintenance db''" do
        Gpdb::ConnectionBuilder.connect!(instance, instance_account)
      end
    end

    context "when connection is successful" do
      it "calls the given block with the postgres connection" do
        mock(fake_connection_adapter).query("foo")
        Gpdb::ConnectionBuilder.connect!(instance, instance_account) do |conn|
          conn.query("foo")
        end
      end

      it "returns the result of the block" do
        result = Gpdb::ConnectionBuilder.connect!(instance, instance_account) do |conn|
          "value returned by block"
        end
        result.should == "value returned by block"
      end

      it "disconnects afterward" do
        mock(fake_connection_adapter).disconnect!
        Gpdb::ConnectionBuilder.connect!(instance, instance_account)
      end
    end

    context "when the connection fails" do
      let(:fake_connection_adapter) { raise ActiveRecord::JDBCError }

      it "does not catch the error" do
        expect {
          Gpdb::ConnectionBuilder.connect!(instance, instance_account)
        }.to raise_error(ActiveRecord::JDBCError)
      end
    end
  end

  describe "#connect" do
    it "calls through to connect!" do
      proc = Proc.new {}
      mock.proxy(Gpdb::ConnectionBuilder).connect!(instance, instance_account, expected_database, &proc)
      Gpdb::ConnectionBuilder.connect(instance, instance_account, expected_database, &proc)
    end

    context "when the connection fails" do
      let(:fake_connection_adapter) { raise ActiveRecord::JDBCError }

      it "returns nil, and does not execute the given block" do
        result = Gpdb::ConnectionBuilder.connect(instance, instance_account) do |conn|
          @block_was_called = true
        end
        result.should be_nil
        @block_was_called.should be_false
      end
    end
  end
end
