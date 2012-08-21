require 'spec_helper'

describe Hdfs::InstanceRegistrar do
  let(:owner) { FactoryGirl.create(:user) }
  let(:hadoop_version) { "0.1.2.3" }
  let(:instance_attributes) do
    {
      :name => "new",
      :description => "old description",
      :port => 12345,
      :host => "server.emc.com",
      :username => "hadoop",
      :group_list => "staff,team1"
    }
  end

  before do
    mock(Hdfs::QueryService).instance_version(is_a(HadoopInstance)) { hadoop_version }
  end

  describe ".create!" do
    context "when connection succeeds but instance is invalid" do
      it "does not save the object" do
        expect {
          Hdfs::InstanceRegistrar.create!({}, owner)
        }.to raise_error(ActiveRecord::RecordInvalid)
      end
    end

    context "when a connection is made using some hadoop version" do
      it "save the instance with right version" do
        instance = Hdfs::InstanceRegistrar.create!(instance_attributes, owner)

        instance.version.should == "0.1.2.3"
        instance.id.should_not be_nil
        instance.should be_valid
      end

      it "saves the hdfs instance" do
        Hdfs::InstanceRegistrar.create!(instance_attributes, owner)

        cached_instance = HadoopInstance.find_by_name_and_owner_id(instance_attributes[:name], owner.id)
        cached_instance.host.should == instance_attributes[:host]
        cached_instance.port.should == instance_attributes[:port]
        cached_instance.description.should == instance_attributes[:description]
        cached_instance.description.should == instance_attributes[:description]
        cached_instance.username.should == instance_attributes[:username]
        cached_instance.group_list.should == instance_attributes[:group_list]
      end

      it "makes a HadoopInstanceCreated event" do
        instance = Hdfs::InstanceRegistrar.create!(instance_attributes, owner)

        event = Events::HadoopInstanceCreated.first
        event.hadoop_instance.should == instance
        event.actor.should == owner
      end
    end
  end

  describe ".update!" do
    let(:user) { FactoryGirl.create(:user) }
    let(:hadoop_instance) { HadoopInstance.new(instance_attributes) }

    before do
      hadoop_instance.owner = owner
      hadoop_instance.save
    end

    context "invalid changes to the instance are made" do
      before do
        instance_attributes[:name] = ''
      end

      it "raises an exception" do
        expect do
          described_class.update!(hadoop_instance.id, instance_attributes, user)
        end.to raise_error(ActiveRecord::RecordInvalid)
      end
    end

    context "valid changes to the instance are made" do
      before do
        instance_attributes[:username] = "another_username"
      end

      it "updates the instance" do
        described_class.update!(hadoop_instance.id, instance_attributes, user)
        hadoop_instance.reload

        hadoop_instance.username.should == 'another_username'
      end

      context "when the name is being changed" do
        before do
          instance_attributes[:name] = "new_instance_name"
        end

        it "generates a HadoopInstanceChangedName event" do
          old_name = hadoop_instance.name

          updated_instance = Hdfs::InstanceRegistrar.update!(hadoop_instance.id, instance_attributes, user)

          event = Events::HadoopInstanceChangedName.find_by_actor_id(user.id)
          event.hadoop_instance.should == updated_instance
          event.old_name.should == old_name
          event.new_name.should == "new_instance_name"
        end
      end

      context "when the name is not being changed" do
        it "does not generate an event" do
          Hdfs::InstanceRegistrar.update!(hadoop_instance.id, instance_attributes, user)
          Events::HadoopInstanceChangedName.find_by_actor_id(owner).should be_nil
        end
      end
    end
  end
end
