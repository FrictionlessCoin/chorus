class DatabaseObjectMigrator < AbstractMigrator
  class << self
    def prerequisites
      GpdbInstanceMigrator.migrate
      HadoopInstanceMigrator.migrate
    end

    def classes_to_validate
      [ Dataset ] # schema and db names could contain non-alphanumeric in 2.1
    end

    def normalize_key(str)
      str.gsub(/^"|"$/, '').gsub('"|"', '|')
    end


    def migrate
      Sunspot.session = Sunspot::Rails::StubSessionProxy.new(Sunspot.session)

      prerequisites

      Legacy.connection.exec_query(%Q(
        CREATE OR REPLACE FUNCTION strip_outside_quotes(s1 varchar) RETURNS varchar AS $$
          BEGIN
            RETURN regexp_replace(s1, '(^")|("$)', '', 'g');
          END;
        $$ LANGUAGE plpgsql;
      ))

      Legacy.connection.exec_query(%Q(
        CREATE OR REPLACE FUNCTION normalize_key(s1 varchar) RETURNS varchar AS $$
          BEGIN
            RETURN regexp_replace(strip_outside_quotes(s1), '"\\\\|"', '|', 'g');
          END;
        $$ LANGUAGE plpgsql;
      ))

      # Result should be a all dataset identifiers across the entire Chorus 2.1 app
      # We have to resolve different quoting (inconsistency in chorus 2.1)

      dataset_rows = Legacy.connection.exec_query(<<-SQL)
        SELECT DISTINCT dataset_string FROM
          (
            (
              SELECT normalize_key(object_id) AS dataset_string
              FROM edc_activity_stream_object
              WHERE entity_type IN ('databaseObject', 'table') AND object_id LIKE '%|%|%|%|%'
            )
            UNION
            (
              SELECT normalize_key(composite_id) AS dataset_string
              FROM edc_dataset
              WHERE type = 'SOURCE_TABLE'
            )
            UNION
            (
              SELECT normalize_key(entity_id) AS dataset_string
              FROM edc_comment
              WHERE entity_type = 'databaseObject'
            )
            UNION
            (
              SELECT normalize_key(entity_id) AS dataset_string
              FROM edc_comment_artifact
              WHERE entity_type = 'databaseObject'
            )
            UNION
            (
              SELECT normalize_key(source_id) AS dataset_string
              FROM edc_import
              WHERE source_type = 'dataset'
            )
            UNION
            (
              SELECT normalize_key(object_id) AS dataset_string
              FROM edc_activity_stream_object
              WHERE entity_type in ('sourceObject', 'view')
              AND object_id LIKE '%|%|%|%|%'
            )
          ) a
        WHERE dataset_string NOT IN (select legacy_id from datasets);
      SQL
      dataset_rows.each do |row_hash|
        dataset_string = row_hash['dataset_string']
        ids = dataset_string.split("|")

        legacy_instance_id = ids[0]
        database_name = ids[1]
        schema_name = ids[2]
        legacy_dataset_type = ids[3]
        next if ids[3] == 'QUERY'
        dataset_name = ids[4]

        gpdb_instance = GpdbInstance.find_by_legacy_id!(legacy_instance_id)
        database = gpdb_instance.databases.find_or_initialize_by_name(database_name)
        database.save(:validate => false)
        schema = database.schemas.find_or_initialize_by_name(schema_name)
        schema.save(:validate => false)
        dataset = legacy_dataset_type == 'VIEW' ? GpdbView.new : GpdbTable.new
        dataset.schema = schema
        dataset.name = dataset_name
        dataset.legacy_id = dataset_string
        dataset.save!
      end

      # ensure that all referenced sandboxes and execution tasks have a schema.
      schema_rows = Legacy.connection.exec_query( <<-SQL)
              SELECT DISTINCT a.instance_id,
                        a.database_name,
                        a.schema_name
              FROM
              (
                (
                   SELECT instance_id, database_name, schema_name
                   FROM edc_sandbox
                )
                UNION
                (
                  SELECT edc_task.instance_id, edc_database.name as database_name, edc_schema.name as schema_name
                  FROM edc_task
                  INNER JOIN edc_database ON
                    edc_database.id=edc_task.database_id
                  INNER JOIN edc_schema ON
                    edc_schema.id=edc_task.schema_id
                )
              ) a
      SQL


      schema_rows.each do |row|
        gpdb_instance = GpdbInstance.find_by_legacy_id!(row['instance_id'])
        database = gpdb_instance.databases.find_or_initialize_by_name(row['database_name'])
        database.save(:validate => false)
        schema = database.schemas.find_or_initialize_by_name(row['schema_name'])
        schema.save(:validate => false)
      end

      Sunspot.session = Sunspot.session.original_session
    end
  end
end