class GpdbDatabase < ActiveRecord::Base
  include Stale

  attr_accessible :name

  validates :name,
            :format => /^[a-zA-Z][a-zA-Z0-9_-]*$/,
            :presence => true,
            :uniqueness => { :scope => :gpdb_instance_id }

  belongs_to :gpdb_instance
  has_many :schemas, :class_name => 'GpdbSchema', :foreign_key => :database_id
  has_many :datasets, :through => :schemas
  has_and_belongs_to_many :instance_accounts


  before_save :mark_schemas_as_stale
  delegate :account_for_user!, :account_for_user, :to => :gpdb_instance

  DATABASE_NAMES_SQL = <<-SQL
  SELECT
    datname
  FROM
    pg_database
  WHERE
    datallowconn IS TRUE AND datname NOT IN ('postgres', 'template1')
    ORDER BY lower(datname) ASC
  SQL

  def self.refresh(account)
    gpdb_instance = account.gpdb_instance
    results = []
    db_names = Gpdb::ConnectionBuilder.connect!(gpdb_instance, account) do |conn|
      conn.exec_query(DATABASE_NAMES_SQL)
    end.map { |row| row["datname"] }

    db_names.map do |name|
      next if new(:name => name).invalid?

      db = gpdb_instance.databases.find_or_create_by_name!(name)
      results << db
      db.update_attributes!({:stale_at => nil}, :without_protection => true)
    end

    results
  end

  def self.reindexDatasetPermissions(database_id)
    GpdbDatabase.find(database_id).datasets.not_stale.each do |dataset|
      begin
        dataset.solr_index
      rescue => e
        Chorus.log_error "Error in GpdbDataset.reindexDatasetPermissions: #{e.message}"
      end
    end
    Sunspot.commit
  end

  def self.visible_to(*args)
    refresh(*args)
  end

  def create_schema(name, current_user)
    raise ActiveRecord::StatementInvalid, "Schema '#{name}' already exists." unless schemas.where(:name => name).empty?
    create_schema_in_gpdb(name, current_user)
    GpdbSchema.refresh(account_for_user!(current_user), self)
    schemas.find_by_name!(name)
  end

  def with_gpdb_connection(account, &block)
    Gpdb::ConnectionBuilder.connect!(account.gpdb_instance, account, name, &block)
  end

  def find_dataset_in_schema(dataset_name, schema_name)
    schemas.find_by_name(schema_name).datasets.find_by_name(dataset_name)
  end

  private

  def create_schema_in_gpdb(name, current_user)
    with_gpdb_connection(gpdb_instance.account_for_user!(current_user)) do |conn|
      sql = "CREATE SCHEMA #{conn.quote_column_name(name)}"
      conn.exec_query(sql)
    end
  end

  def mark_schemas_as_stale
    if stale? && stale_at_changed?
      schemas.each do |schema|
        schema.mark_stale!
      end
    end
  end
end
