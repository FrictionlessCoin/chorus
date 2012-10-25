require "tempfile"
require 'digest/md5'

module InstanceIntegration
  config_file = "test_instance_connection_config.yml"

  REAL_GPDB_HOST = ENV['GPDB_HOST'] || 'local_greenplum'
  REAL_HADOOP_HOST = ENV['HADOOP_HOST']
  CONFIG          = YAML.load_file(Rails.root + "config/#{config_file}")
  INSTANCE_CONFIG = CONFIG['instances']['gpdb'].find { |hash| hash["host"] == REAL_GPDB_HOST }
  ACCOUNT_CONFIG  = INSTANCE_CONFIG['account']
  REAL_GPDB_USERNAME = ACCOUNT_CONFIG['db_username']
  REAL_GPDB_PASSWORD = ACCOUNT_CONFIG['db_password']

  def self.real_gpdb_hostname
    if REAL_GPDB_HOST.match /^([0-9]{1,3}\.){3}[0-9]{1,3}$/
      return "local_greenplum"
    end
    REAL_GPDB_HOST.gsub('-', '_')
  end

  def self.execute_sql(sql_file)
    puts "Executing SQL file: #{sql_file} on host: #{INSTANCE_CONFIG['host']}"
    sql_read = File.read(File.expand_path("../#{sql_file}", __FILE__))

    sql = sql_read.gsub('gpdb_test_database', InstanceIntegration.database_name)
    puts "  Replacing gpdb_test_database with #{InstanceIntegration.database_name}"

    connection_params = [
        "-U #{ACCOUNT_CONFIG['db_username']}",
        "-h #{INSTANCE_CONFIG['host']}",
        "-p #{INSTANCE_CONFIG['port']}"
    ].join(" ")

    Tempfile.open("setup_gpdb") do |f|
      f.write(sql)
      f.flush

      # silence stdout, remove hints and notices warnings from stderr
      filter_stderr = "2>&1 1>/dev/null | egrep -v \"NOTICE|HINT\" 1>&2"

      system "PGPASSWORD=#{ACCOUNT_CONFIG['db_password']} psql #{INSTANCE_CONFIG['maintenance_db']} #{connection_params} < #{f.path} #{filter_stderr}"
    end
  end

  def self.exec_sql_line(sql)
    conn = ActiveRecord::Base.postgresql_connection(
        :host => INSTANCE_CONFIG['host'],
        :port => INSTANCE_CONFIG['port'],
        :database => self.database_name,
        :username => ACCOUNT_CONFIG['db_username'],
        :password => ACCOUNT_CONFIG['db_password'],
        :adapter => "jdbcpostgresql")
    conn.exec_query(sql)
  end

  def self.setup_gpdb
    execute_sql("setup_gpdb.sql")
    record_sql_changes
  end

  def self.record_sql_changes
    File.open(sql_file_hash_path, 'w') do |f|
      f << sql_file_hash
    end
  end

  def self.sql_changed?
    return true unless File.exists?(sql_file_hash_path)
    File.read(sql_file_hash_path) != sql_file_hash
  end

  def self.sql_file_hash_path
    Rails.root + 'tmp/setup_gpdb_hash'
  end

  def self.sql_file_hash
    Digest::MD5.hexdigest(File.read(Rails.root + 'spec/support/database_integration/setup_gpdb.sql'))
  end

  def self.database_name
    "gpdb_#{Socket.gethostname}_#{Rails.env.slice(0..2)}"
  end

  def self.instance_config_for_gpdb(name)
    config = CONFIG['instances']['gpdb'].find { |hash| hash["host"] == name }
    config.reject { |k,v| k == "account"}
  end

  def self.instance_config_for_hadoop(name = REAL_HADOOP_HOST)
    CONFIG['instances']['hadoop'].find { |hash| hash["host"] == name }
  end

  def self.account_config_for_gpdb(name)
    config = CONFIG['instances']['gpdb'].find { |hash| hash["host"] == name }
    config["account"]
  end

  def self.refresh_chorus
    account = InstanceIntegration.real_gpdb_account

    InstanceIntegration.setup_gpdb
    GpdbDatabase.refresh(account)

    database = GpdbDatabase.find_by_name(InstanceIntegration.database_name)
    GpdbSchema.refresh(account, database)
    gpdb_schema = database.schemas.find_by_name('test_schema')
    Dataset.refresh(account, gpdb_schema)

    database_without_public_schema = GpdbDatabase.find_by_name("#{InstanceIntegration.database_name}_no_pub_sch")
    GpdbSchema.refresh(account, database_without_public_schema)
    gpdb_schema_without_public_schema = database_without_public_schema.schemas.find_by_name('non_public_schema')
    Dataset.refresh(account, gpdb_schema_without_public_schema)

    account
  end

  def refresh_chorus
    InstanceIntegration.refresh_chorus
  end

  def self.real_gpdb_account
    gpdb_instance = InstanceIntegration.real_gpdb_instance
    gpdb_instance.owner_account
  end

  def self.real_gpdb_instance
    GpdbInstance.find_by_name(real_gpdb_hostname)
  end

  def self.real_database
    real_gpdb_instance.databases.find_by_name!(self.database_name)
  end
end

