module Gpdb
  class InstanceStatus
    def self.check
      Instance.scoped.each do |instance|
        instance.online = false
        Gpdb::ConnectionBuilder.connect(instance, instance.owner_account) do |conn|
          instance.online = true
          version_string = conn.exec_query("select version()")[0]["version"]
          # if the version string looks like this:
          # PostgreSQL 9.2.15 (Greenplum Database 4.1.1.2 build 2) on i386-apple-darwin9.8.0 ...
          # then we just want "4.1.1.2"

          instance.version = version_string.match(/Greenplum Database ([\d\.]*)/)[1]
        end
        instance.save!
      end
    end
  end
end
