require_relative 'legacy'

class UserMigrator < AbstractMigrator
  class << self
    def prerequisites
    end

    def classes_to_validate
      [User]
    end

    def migrate
      prerequisites
      Legacy.connection.exec_query("INSERT INTO public.users(
                                legacy_id,
                                username,
                                first_name,
                                last_name,
                                email,
                                title,
                                dept,
                                notes,
                                admin,
                                created_at,
                                updated_at,
                                deleted_at,
                                legacy_password_digest)
                              SELECT
                                edc_user.id,
                                user_name,
                                first_name,
                                last_name,
                                email_address,
                                title,
                                ou,
                                notes,
                                admin,
                                created_tx_stamp AT TIME ZONE 'UTC',
                                last_updated_tx_stamp AT TIME ZONE 'UTC',
                                CASE is_deleted
                                    WHEN 't' THEN last_updated_tx_stamp AT TIME ZONE 'UTC'
                                    ELSE null
                                  END,
                                substring(password, 6)
                              FROM edc_user
                              WHERE edc_user.id NOT IN (SELECT legacy_id FROM users WHERE legacy_id IS NOT NULL);")
    end
  end
end