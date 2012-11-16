module Gpdb
  class InstanceStillProvisioning < StandardError; end
  class InstanceOverloaded < StandardError; end

  module ConnectionBuilder
    def self.connect!(gpdb_instance, account, database_name=nil)
      raise InstanceStillProvisioning if gpdb_instance.state == "provisioning"

      connection = ActiveRecord::Base.postgresql_connection(
        :host => gpdb_instance.host,
        :port => gpdb_instance.port,
        :database => database_name || gpdb_instance.maintenance_db,
        :username => account.db_username,
        :password => account.db_password,
        :adapter => "jdbcpostgresql"
      )
      # TODO: this yield should really be after most of the exception handling [#39664445]
      yield connection if block_given?
    rescue ActiveRecord::JDBCError => e
      friendly_message = "#{Time.now.strftime("%Y-%m-%d %H:%M:%S")} ERROR: Failed to establish JDBC connection to #{gpdb_instance.host}:#{gpdb_instance.port}"
      Rails.logger.error(friendly_message + " - " + e.message)

      if e.message.include?("password")
        raise ActiveRecord::JDBCError.new("Password authentication failed for user '#{account.db_username}'")
      elsif e.message.include?("too many clients")
        raise InstanceOverloaded
      else
        raise ActiveRecord::JDBCError.new("The instance you have selected is unavailable at the moment")
      end
    rescue ActiveRecord::StatementInvalid => e
      friendly_message = "#{Time.now.strftime("%Y-%m-%d %H:%M:%S")} ERROR: SQL Statement Invalid"
      Rails.logger.warn(friendly_message + " - " + e.message)
      raise e
    ensure
      connection.try(:disconnect!)
    end
  end
end
