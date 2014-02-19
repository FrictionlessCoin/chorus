class SandboxesController < ApplicationController
  before_filter :require_sandboxes
  wrap_parameters :sandbox, :exclude => [:workspace_id]

  def create
    workspace = Workspace.find(params[:workspace_id])
    authorize! :update, workspace

    attributes = params[:sandbox]
    Workspace.transaction do
      begin
        workspace.sandbox = GpdbSchema.find(attributes[:schema_id]) if attributes[:schema_id]
        if attributes[:schema_name]
          if attributes[:database_name]
            gpdb_data_source = GpdbDataSource.find(attributes[:data_source_id])
            database = gpdb_data_source.create_database(attributes[:database_name], current_user)
          else
            database = GpdbDatabase.find(attributes[:database_id])
          end

          GpdbSchema.refresh(database.data_source.account_for_user!(current_user), database)

          create_schema = attributes[:schema_name] && attributes[:schema_name] != 'public'
          if create_schema
            workspace.sandbox = database.create_schema(attributes[:schema_name], current_user)
          else
            workspace.sandbox = database.schemas.find_by_name(attributes[:schema_name])
          end
        end

        workspace.show_sandbox_datasets = attributes[:show_sandbox_datasets] if attributes.has_key?(:show_sandbox_datasets)
        if workspace.sandbox_id_changed? && workspace.sandbox
          Events::WorkspaceAddSandbox.by(current_user).add(
              :sandbox_schema => workspace.sandbox,
              :workspace => workspace
          )
        end
        workspace.save!
      rescue ActiveRecord::RecordInvalid => e
        raise
      rescue Exception => e
        raise ApiValidationError.new(database ? :schema : :database, :generic, {:message => e.message})
      end
    end

    render :json => {}, :status => :created
  end

  private

  def require_sandboxes
    render_not_licensed if License.instance.limit_sandboxes?
  end
end
