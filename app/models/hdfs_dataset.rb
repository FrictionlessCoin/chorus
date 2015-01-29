class HdfsDataset < Dataset
  include SharedSearch

  alias_attribute :file_mask, :query
  attr_accessible :file_mask
  validates_presence_of :file_mask, :workspace
  validate :ensure_active_workspace, :if => Proc.new { |f| f.changed? }
  validates_uniqueness_of :name, :scope => [:workspace_id, :type, :deleted_at]

  belongs_to :hdfs_data_source
  belongs_to :workspace
  delegate :data_source, :connect_with, :connect_as, :to => :hdfs_data_source

  after_create :make_created_event, :if => :current_user

  include_shared_search_fields :workspace, :workspace

  HdfsContentsError = Class.new(StandardError)

  def self.assemble!(attributes, hdfs_data_source, workspace)
      dataset = HdfsDataset.new attributes
      dataset.hdfs_data_source = hdfs_data_source
      dataset.workspace = workspace
      dataset.save!
      dataset
  end

  def self.destroy_datasets(data_source_id)
    # Don't use dependent => destroy because it pulls them all into memory
    HdfsDataset.where(:hdfs_data_source_id => data_source_id).find_each { |dataset| dataset.destroy }
  end

  ## include bogus definitions for fields that are searchable in other models
  [:database_name, :table_description, :schema_name, :column_name, :column_description].each do |searchable_field|
    define_method(searchable_field) do
      nil
    end
  end

  def data_source_account_ids
    []
  end

  def found_in_workspace_id
    [workspace_id]
  end

  def path
    file_mask
  end

  def contents
    hdfs_query = Hdfs::QueryService.for_data_source(hdfs_data_source, current_user ? current_user.username : '')
    hdfs_query.show(file_mask)
  rescue StandardError => e
    raise HdfsContentsError.new(e)
  end

  def self.source_class
    HdfsDataSource
  end

  def in_workspace?(workspace)
    self.workspace == workspace
  end

  def associable?
    false
  end

  def needs_schema?
    false
  end

  def accessible_to(user)
    true
  end

  def verify_in_source(user)
    true
  end

  def execution_location
    hdfs_data_source
  end

  def ensure_active_workspace
    self.errors[:dataset] << :ARCHIVED if workspace && workspace.archived?
  end

  def make_updated_event
    Events::HdfsDatasetUpdated.by(current_user).add(
        :workspace => workspace,
        :dataset => self,
        :hdfs_data_source => hdfs_data_source
    )
  end

  def make_created_event
    Events::HdfsDatasetCreated.by(current_user).add(
        :workspace => workspace,
        :dataset => self,
        :hdfs_data_source => hdfs_data_source
    )
  end
end
