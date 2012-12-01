class WorkspaceMigrator < AbstractMigrator
  class << self
    def prerequisites
      UserMigrator.migrate
      # for all Workspaces to be valid, depends on MembershipMigrator, but is circular
    end

    def classes_to_validate
      [
          [Workspace, {:include => [:owner, :members, :archiver]}]
      ]
    end

    def migrate
      prerequisites

      Legacy.connection.exec_query("
        INSERT INTO public.workspaces(
          legacy_id,
          name,
          public,
          archived_at,
          archiver_id,
          summary,
          owner_id,
          has_added_member,
          has_added_sandbox,
          has_added_workfile,
          has_changed_settings,
          deleted_at,
          created_at,
          updated_at)
        SELECT
          edc_workspace.id,
          name,
          CASE is_public
            WHEN 'f' THEN false
            ELSE true
          END,
          archived_timestamp AT TIME ZONE 'UTC',
          archivers.id,
          summary,
          owners.id,
          true,
          true,
          true,
          true,
          CASE is_deleted
            WHEN 't' THEN last_updated_tx_stamp AT TIME ZONE 'UTC'
            ELSE null
          END,
          created_tx_stamp AT TIME ZONE 'UTC',
          last_updated_tx_stamp AT TIME ZONE 'UTC'
        FROM edc_workspace
          LEFT JOIN users archivers ON archivers.username = archiver
          LEFT JOIN users owners ON owners.username = owner
        WHERE edc_workspace.id NOT IN (SELECT legacy_id FROM workspaces);")
    end
  end
end
