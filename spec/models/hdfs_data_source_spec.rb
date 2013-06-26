require 'spec_helper'

describe HdfsDataSource do
  subject { hdfs_data_sources(:hadoop) }

  it_behaves_like "a notable model" do
    let!(:note) do
      Events::NoteOnHdfsDataSource.create!({
        :actor => users(:owner),
        :hdfs_data_source => model,
        :body => "This is the body"
      }, :as => :create)
    end

    let!(:model) { FactoryGirl.create(:hdfs_data_source) }
  end

  describe "associations" do
    it { should belong_to :owner }
    its(:owner) { should be_a User }
    it { should have_many :activities }
    it { should have_many :events }
    it { should have_many :hdfs_entries }
  end

  describe "validations" do
    it { should validate_presence_of :host }
    it { should validate_presence_of :name }
    it { should validate_presence_of :port }
    it do
      should ensure_inclusion_of(:hdfs_version).in_array(ChorusConfig.instance['hdfs.versions'])
    end

    it_should_behave_like "it validates with DataSourceNameValidator"

    it_should_behave_like 'a model with name validations' do
      let(:factory_name) { :hdfs_data_source }
    end
  end

  describe "destroy" do
    it "enqueues a destroy_entries job" do
      mock(QC.default_queue).enqueue_if_not_queued("HdfsEntry.destroy_entries", subject.id)
      subject.destroy
    end

    it "creates an event" do
      set_current_user(users(:admin))
      expect { subject.destroy }.to change { Events::DataSourceDeleted.count }.by(1)
      Events::DataSourceDeleted.last.data_source.should == subject
    end

    it "removes itself from the execution location field of any workfiles it owns" do
      workfiles = subject.workfiles_as_execution_location.all
      workfiles.length.should > 0

      subject.destroy
      workfiles.each do |workfile|
        workfile.reload.execution_location_id.should be_nil
      end
    end
  end

  describe "#check_status!" do
    let(:data_source) { hdfs_data_sources(:hadoop) }

    context "when the data source is offline" do

      before do
        stub(Hdfs::QueryService).accessible? { false }
      end

      it "sets the state to offline" do
        data_source.state = "whatever"
        data_source.check_status!
        data_source.state.should == "offline"
      end

      it "updates last_checked_at" do
        expect {
          data_source.check_status!
        }.to change(data_source, :last_checked_at)
      end

      it "does not update last_online_at" do
        expect {
          data_source.check_status!
        }.not_to change(data_source, :last_online_at)
      end
    end

    context "when the data source is online"
    before do
      stub(Hdfs::QueryService).accessible? { true }
    end

    it "sets the state to online" do
      data_source.state = "whatever"
      data_source.check_status!
      data_source.state.should == "online"
    end

    it "updates the version" do
      data_source.version = "whatever"
      data_source.check_status!
    end

    it "updates last_checked_at" do
      expect {
        data_source.check_status!
      }.to change(data_source, :last_checked_at)
    end

    it "updates last_online_at" do
      expect {
        data_source.check_status!
      }.to change(data_source, :last_online_at)
    end
  end

  describe "#refresh" do
    let(:root_file) { HdfsEntry.new({:path => '/foo.txt'}, :without_protection => true) }
    let(:root_dir) { HdfsEntry.new({:path => '/bar', :is_directory => true}, :without_protection => true) }
    let(:deep_dir) { HdfsEntry.new({:path => '/bar/baz', :is_directory => true}, :without_protection => true) }

    it "lists the root directory for the data source" do
      mock(HdfsEntry).list('/', subject) { [root_file, root_dir] }
      mock(HdfsEntry).list(root_dir.path, subject) { [] }
      subject.refresh
    end

    it "recurses through the directory hierarchy" do
      mock(HdfsEntry).list('/', subject) { [root_file, root_dir] }
      mock(HdfsEntry).list(root_dir.path, subject) { [deep_dir] }
      mock(HdfsEntry).list(deep_dir.path, subject) { [] }
      subject.refresh
    end

    context "when the server is not reachable" do
      let(:data_source) { hdfs_data_sources(:hadoop) }
      before do
        any_instance_of(Hdfs::QueryService) do |qs|
          stub(qs).list { raise Hdfs::DirectoryNotFoundError.new("ERROR!") }
        end
      end

      it "marks all the hdfs entries as stale" do
        data_source.refresh
        data_source.hdfs_entries.size.should > 3
        data_source.hdfs_entries.each do |entry|
          entry.should be_stale
        end
      end
    end

    context "when a DirectoryNotFoundError happens on a subdirectory" do
      let(:data_source) { hdfs_data_sources(:hadoop) }
      before do
        any_instance_of(Hdfs::QueryService) do |qs|
          stub(qs).list { raise Hdfs::DirectoryNotFoundError.new("ERROR!") }
        end
      end

      it "does not mark any entries as stale" do
        expect {
          data_source.refresh("/foo")
        }.to_not change { data_source.hdfs_entries.not_stale.count }
      end
    end
  end

  describe "#attempt_connection" do
    it "does not throw" do
      subject.attempt_connection(nil)
    end
  end

  describe "after being created" do
    before do
      @new_data_source = HdfsDataSource.create({:owner => User.first, :name => "Hadoop", :host => "localhost", :port => "8020", :hdfs_version => "Pivotal HD"}, { :without_protection => true })
    end

    it "creates an HDFS root entry" do
      root_entry = @new_data_source.hdfs_entries.find_by_path("/")
      root_entry.should be_present
      root_entry.is_directory.should be_true
    end
  end

  describe "after being updated" do
    let(:data_source) { HdfsDataSource.first }

    it "it doesn't create any entries" do
      expect {
        data_source.name += "_updated"
        data_source.save!
      }.not_to change(HdfsEntry, :count)
    end
  end

  describe "supports_work_flows" do
    let(:data_source) { hdfs_data_sources(:hdfs_data_source44445) }
    context "when the data source has a job tracker host and port" do
      it "returns true" do
        expect(data_source.supports_work_flows).to be_true
      end
    end

    context "when the job tracker host is missing" do
      before do
        data_source.job_tracker_host = nil
      end

      it "returns true" do
        expect(data_source.supports_work_flows).to be_false
      end
    end

    context "when the job tracker host is missing" do
      before do
        data_source.job_tracker_port = nil
      end

      it "returns true" do
        expect(data_source.supports_work_flows).to be_false
      end
    end
  end

  it_should_behave_like "taggable models", [:hdfs_data_sources, :hadoop]

  it_behaves_like 'a soft deletable model' do
    let(:model) { subject }
  end

  describe '.with_job_tracker' do
    it 'only includes the hdfs data sources with job tracker info' do
      HdfsDataSource.with_job_tracker.should =~ (HdfsDataSource.all - [hdfs_data_sources(:hadoop)])
    end
  end
end
