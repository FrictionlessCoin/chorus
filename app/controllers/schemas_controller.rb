class SchemasController < GpdbController
  def index
    database = GpdbDatabase.find(params[:database_id])
    GpdbSchema.refresh(authorized_gpdb_account(database), database)
    present database.schemas.order("lower(name)")
  end

  def show
    schema = GpdbSchema.find_and_verify_in_source(params[:id], current_user)
    authorize_instance_access(schema)
    present schema
  end
end
