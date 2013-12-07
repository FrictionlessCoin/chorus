class GpdbDataSource < ConcreteDataSource
  has_many :databases, :class_name => 'GpdbDatabase', :foreign_key => "data_source_id"
  has_many :schemas, :through => :databases, :class_name => 'GpdbSchema'
  has_many :datasets, :through => :schemas
  has_many :imports_as_source, :through => :datasets, :source => :imports
  has_many :imports_as_destination_via_schema, :through => :schemas, :source => :imports
  has_many :imports_as_destination_via_workspace, :through => :schemas, :source => :imports_via_workspaces
  has_many :workspaces, :through => :schemas, :foreign_key => 'sandbox_id'

  after_destroy :enqueue_destroy_databases

  def self.create_for_user(user, data_source_hash)
    user.gpdb_data_sources.create!(data_source_hash, :as => :create)
  end

  def used_by_workspaces(viewing_user)
    workspaces.includes({:sandbox => {:scoped_parent => :data_source }}, :owner).workspaces_for(viewing_user).order("lower(workspaces.name), id")
  end

  def create_database(name, current_user)
    new_db = GpdbDatabase.new(:name => name, :data_source => self)
    raise ActiveRecord::RecordInvalid.new(new_db) unless new_db.valid?

    connect_as(current_user).create_database(name)
    refresh_databases
    databases.find_by_name!(name)
  end

  def refresh_databases(options ={})
    found_databases = []
    rows = connect_with(owner_account).prepare_and_execute_statement(database_and_role_sql).hashes
    database_account_groups = rows.inject({}) do |groups, row|
      groups[row["database_name"]] ||= []
      groups[row["database_name"]] << row["db_username"]
      groups
    end

    database_account_groups.each do |database_name, db_usernames|
      database = databases.find_or_initialize_by_name(database_name)

      if database.invalid?
        databases.delete(database)
        next
      end

      database.update_attributes!({:stale_at => nil}, :without_protection => true)
      database_accounts = accounts.where(:db_username => db_usernames)
      if database.data_source_accounts.sort != database_accounts.sort
        database.data_source_accounts = database_accounts
        QC.enqueue_if_not_queued("GpdbDatabase.reindex_datasets", database.id) if database.datasets.count > 0
      end
      found_databases << database
    end
    refresh_schemas options unless options[:skip_schema_refresh]
  rescue GreenplumConnection::QueryError => e
    Chorus.log_error "Could not refresh database: #{e.message} on #{e.backtrace[0]}"
  ensure
    (databases.not_stale - found_databases).each(&:mark_stale!) if options[:mark_stale]
  end

  def refresh_schemas(options={})
    databases.not_stale.each do |database|
      begin
        Schema.refresh(owner_account, database, options.reverse_merge(:refresh_all => true))
      rescue GreenplumConnection::DatabaseError => e
        Chorus.log_debug "Could not refresh database #{database.name}: #{e.message} #{e.backtrace.to_s}"
      end
    end
  end

  def entity_type_name
    'gpdb_data_source'
  end

  def data_source_provider
    "Greenplum Database"
  end

  def attempt_connection(user)
    connect_as(user).connect!
  end

  private

  def account_names
    accounts.pluck(:db_username)
  end

  def database_and_role_sql
    roles = Arel::Table.new("pg_catalog.pg_roles", :as => "r")
    databases = Arel::Table.new("pg_catalog.pg_database", :as => "d")

    roles.join(databases).
        on(Arel.sql("has_database_privilege(r.oid, d.oid, 'CONNECT')")).
        where(
        databases[:datname].not_eq("postgres").
            and(databases[:datistemplate].eq(false)).
            and(databases[:datallowconn].eq(true)).
            and(roles[:rolname].in(account_names))
    ).project(
        roles[:rolname].as("db_username"),
        databases[:datname].as("database_name")
    ).to_sql
  end

  def connection_class
    GreenplumConnection
  end

  def cancel_imports
    imports_as_source.unfinished.each do |import|
      import.cancel(false, "Source/Destination of this import was deleted")
    end
    imports_as_destination_via_schema.unfinished.each do |import|
      import.cancel(false, "Source/Destination of this import was deleted")
    end
    imports_as_destination_via_workspace.unfinished.each do |import|
      import.cancel(false, "Source/Destination of this import was deleted")
    end
  end

  def enqueue_destroy_databases
    QC.enqueue_if_not_queued("GpdbDatabase.destroy_databases", id)
  end
end
