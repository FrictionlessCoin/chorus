require 'fileutils'
require 'timeout'

class GpPipe < DelegateClass(GpTableCopier)
  class ImportFailed < StandardError; end

  GPFDIST_TIMEOUT_SECONDS = 600

  def self.timeout_seconds
    GPFDIST_TIMEOUT_SECONDS
  end

  def self.grace_period_seconds
    5
  end

  def self.gpfdist_url
    Chorus::Application.config.chorus['gpfdist.url']
  end

  def self.protocol
    Chorus::Application.config.chorus['gpfdist.ssl.enabled'] ? 'gpfdists' : 'gpfdist'
  end

  def self.write_protocol
    self.protocol
  end

  def self.read_protocol
    self.protocol
  end

  def pipe_name
    @pipe_name ||= "pipe_#{Process.pid}_#{Time.now.to_i}"
  end

  def write_pipe
    src_conn.exec_query("INSERT INTO \"#{source_schema.name}\".#{pipe_name}_w (SELECT * FROM #{source_table_fullname} #{limit_clause});")
  end

  def read_pipe(count)
    done_read = 0
    while done_read != count
      # p "Inside the read loop: done read = #{done_read}, count = #{count}"
      result = dst_conn.exec_query("INSERT INTO #{destination_table_fullname} (SELECT * FROM \"#{destination_schema.name}\".#{pipe_name}_r);")
      done_read += result
    end
  end

  def write_pipe_f(semaphore)
    write_pipe
  ensure
    # p 'Write Pipe Releasing'
    semaphore.release
  end

  def read_pipe_f(semaphore, count)
    read_pipe(count)
  ensure
    # p 'Read Pipe Releasing'
    semaphore.release
  end

  def run
    # p "CALLING RUN"
    Timeout::timeout(GpPipe.timeout_seconds) do
      pipe_file = File.join(gpfdist_data_dir, pipe_name)
      unless source_table.query_setup_sql.blank?
        src_conn.exec_query("#{source_table.query_setup_sql};")
      end
      count = src_conn.exec_query(" SELECT count(*) from #{source_table_fullname};")[0]['count']
      no_rows_to_import = (count == 0) || row_limit == 0
      count = row_limit if row_limit && row_limit < count

      if create_new_table?
        dst_conn.exec_query("CREATE TABLE #{destination_table_fullname}(#{table_definition_with_keys(src_conn)}) #{distribution_key_clause}")
      elsif truncate?
        dst_conn.exec_query("TRUNCATE TABLE #{destination_table_fullname}")
      end
      unless no_rows_to_import
        begin
          system "mkfifo #{pipe_file}"
          src_conn.exec_query("CREATE WRITABLE EXTERNAL TABLE \"#{source_schema.name}\".#{pipe_name}_w (#{table_definition(src_conn)})
                                 LOCATION ('#{GpPipe.write_protocol}://#{GpPipe.gpfdist_url}:#{gpfdist_write_port}/#{pipe_name}') FORMAT 'TEXT';")
          dst_conn.exec_query("CREATE EXTERNAL TABLE \"#{destination_schema.name}\".#{pipe_name}_r (#{table_definition(src_conn)})
                               LOCATION ('#{GpPipe.read_protocol}://#{GpPipe.gpfdist_url}:#{gpfdist_read_port}/#{pipe_name}') FORMAT 'TEXT';")

          semaphore = java.util.concurrent.Semaphore.new(0)
          thr1 = Thread.new { write_pipe_f(semaphore) }
          thr2 = Thread.new { read_pipe_f(semaphore, count) }

          semaphore.acquire
          # p "Write thread status: #{thr1.status}"
          # p "Read thread status: #{thr2.status}"

          thread_hung = !semaphore.tryAcquire(GpPipe.grace_period_seconds * 1000, java.util.concurrent.TimeUnit::MILLISECONDS)
          raise Exception if thread_hung

          #collect any exceptions raised inside thread1 or thread2
          thr1.join
          thr2.join
        rescue Exception => e
          # p "Rescuing from an exception: #{e.class} #{e.message}"

          src_conn.raw_connection.connection.cancelQuery
          dst_conn.raw_connection.connection.cancelQuery
          # p "Killing both child threads."
          thr1.try(:kill)
          thr2.try(:kill)
          if create_new_table?
            dst_conn.exec_query("DROP TABLE IF EXISTS #{destination_table_fullname}")
          end

          # p "pg_stat_activity"
          # with_dst_connection {|c| puts c.exec_query("SELECT * FROM pg_stat_activity")}
          # p "Raising exception."
          raise ImportFailed, e.message
        ensure
          # p "Inside ensure block: dropping external tables."

          with_src_connection {|c| c.exec_query("DROP EXTERNAL TABLE IF EXISTS \"#{source_schema.name}\".#{pipe_name}_w;") }
          with_dst_connection {|c| c.exec_query("DROP EXTERNAL TABLE IF EXISTS \"#{destination_schema.name}\".#{pipe_name}_r;") }
          FileUtils.rm pipe_file if File.exists? pipe_file
        end
      end
    end
  ensure
    disconnect_src_conn
    disconnect_dst_conn
  end

  def disconnect_src_conn
    src_conn.disconnect!
    @raw_src_conn = nil
  end

  def disconnect_dst_conn
    dst_conn.disconnect!
    @raw_dst_conn = nil
  end

  def src_conn
    @raw_src_conn ||= create_source_connection
  end

  def with_src_connection
    conn = create_source_connection
    yield conn
  ensure
    conn.disconnect!
  end

  def dst_conn
    @raw_dst_conn ||= create_destination_connection
  end

  def with_dst_connection
    conn = create_destination_connection
    yield conn
  ensure
    conn.disconnect!
  end

  private

  def gpfdist_data_dir
    Chorus::Application.config.chorus['gpfdist.data_dir']
  end

  def gpfdist_write_port
    Chorus::Application.config.chorus['gpfdist.write_port']
  end

  def gpfdist_read_port
    Chorus::Application.config.chorus['gpfdist.read_port']
  end

  def create_source_connection
    ActiveRecord::Base.postgresql_connection(
        :host => source_schema.gpdb_instance.host,
        :port => source_schema.gpdb_instance.port,
        :database => source_schema.database.name,
        :username => source_account.db_username,
        :password => source_account.db_password,
        :adapter => "jdbcpostgresql"
    )
  end

  def create_destination_connection
    ActiveRecord::Base.postgresql_connection(
        :host => destination_schema.gpdb_instance.host,
        :port => destination_schema.gpdb_instance.port,
        :database => destination_schema.database.name,
        :username => destination_account.db_username,
        :password => destination_account.db_password,
        :adapter => "jdbcpostgresql"
    )
  end
end
