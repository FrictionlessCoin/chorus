require 'spec_helper'

describe GpdbInstancePresenter, :type => :view do
  let(:gpdb_instance) { data_sources(:owners) }
  let(:user) { gpdb_instance.owner }
  let(:presenter) { GpdbInstancePresenter.new(gpdb_instance, view, options) }
  let(:options) { {} }

  before do
    set_current_user(user)
  end

  describe "#to_hash" do
    before do
      any_instance_of(GpdbSchema) do |schema|
        stub(schema).disk_space_used { 10 }
      end
    end
    let(:hash) { presenter.to_hash }

    it "includes the right keys" do
      hash.should have_key(:name)
      hash.should have_key(:port)
      hash.should have_key(:host)
      hash.should have_key(:id)
      hash.should have_key(:owner)
      hash.should have_key(:shared)
      hash.should have_key(:state)
      hash.should have_key(:provision_type)
      hash.should have_key(:maintenance_db)
      hash.should have_key(:description)
      hash.should have_key(:instance_provider)
      hash.should have_key(:version)
      hash[:entity_type].should == "gpdb_instance"
    end

    it "should use ownerPresenter Hash method for owner" do
      owner = hash[:owner]
      owner.to_hash.should == (UserPresenter.new(user, view).presentation_hash)
    end

    it_behaves_like "activity stream instance presenter"
  end
end