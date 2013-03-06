require 'timeout'

require Rails.root.join('vendor/hadoop/hdfs-query-service-0.0.2.jar')

module Hdfs
  include Chorus

  PREVIEW_LINE_COUNT = 200
  DirectoryNotFoundError = Class.new(StandardError)
  FileNotFoundError = Class.new(StandardError)

  JavaHdfs = com.emc.greenplum.hadoop.Hdfs
  JavaHdfs.timeout = 5

  class QueryService
    def self.instance_version(instance)
      new(instance.host, instance.port, instance.username, instance.version).version
    end

    def initialize(host, port, username, version = nil)
      @host = host
      @port = port.to_s
      @username = username
      @version = version
    end

    def version
      version = JavaHdfs.new(@host, @port, @username, @version).version
      unless version
        Chorus.log_error "Within JavaHdfs connection, failed to establish connection to #{@host}:#{@port}"
        raise ApiValidationError.new(:connection, :generic, {:message => "Unable to determine HDFS server version or unable to reach server at #{@host}:#{@port}. Check connection parameters."})
      end
      version.get_name
    end

    def list(path)
      list = JavaHdfs.new(@host, @port, @username, @version).list(path)
      raise DirectoryNotFoundError, "Directory does not exist: #{path}" unless list
      list.map do |object|
        {
          'path' => object.path,
          'modified_at' => object.modified_at,
          'is_directory' => object.is_directory,
          'size' => object.size,
          'content_count' => object.content_count
        }
      end
    end

    def show(path)
      contents = JavaHdfs.new(@host, @port, @username, @version).content(path, PREVIEW_LINE_COUNT)
      raise FileNotFoundError, "File not found on HDFS: #{path}" unless contents
      contents
    end
  end
end
