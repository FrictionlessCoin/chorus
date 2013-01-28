class GpdbInstanceMigrator < AbstractMigrator
  class << self
    def prerequisites
      UserMigrator.migrate
    end

    def classes_to_validate
      [GpdbInstance]
    end

    def migrate
      prerequisites
      Legacy.connection.exec_query("INSERT INTO public.gpdb_instances(
                              legacy_id,
                              name,
                              description,
                              host,
                              port,
                              provision_type,
                              instance_provider,
                              maintenance_db,
                              owner_id,
                              state,
                              created_at,
                              updated_at
                              )
                            SELECT
                              i.id,
                              i.name,
                              i.description,
                              i.host,
                              i.port,
                              i.provision_type,
                              i.instance_provider,
                              i.maintenance_db,
                              (SELECT users.id FROM users WHERE users.username = i.owner ORDER BY users.legacy_id DESC limit 1),
                              i.state,
                              i.created_tx_stamp,
                              i.last_updated_tx_stamp
                            FROM edc_instance i
                            WHERE instance_provider = 'Greenplum Database'
                            AND i.id NOT IN (SELECT legacy_id FROM gpdb_instances);")

    end
  end
end