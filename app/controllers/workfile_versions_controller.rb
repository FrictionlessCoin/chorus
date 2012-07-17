class WorkfileVersionsController < ApplicationController
  def update
    workfile = Workfile.find(params[:workfile_id])
    authorize! :can_edit_sub_objects,  workfile.workspace
    workfile_version = workfile.versions.find(params[:id])
    workfile_version.update_content(params[:workfile][:content])
    remove_draft(workfile)

    present workfile.last_version
  end

  def create
    workfile = Workfile.find(params[:workfile_id])
    authorize! :can_edit_sub_objects,  workfile.workspace
    file = build_new_file(workfile.file_name, params[:workfile][:content])
    file.content_type = workfile.last_version.contents_content_type
    workfile.build_new_version(current_user, file, params[:workfile][:commit_message]).save
    remove_draft(workfile)

    present workfile.last_version
  end

  def show
    workfile = Workfile.find(params[:workfile_id])
    authorize! :show,  workfile.workspace

    workfile_version = WorkfileVersion.find(params[:id])
    present workfile_version
  end

  def index
    workfile = Workfile.find(params[:workfile_id])
    authorize! :show,  workfile.workspace

    present workfile.versions
  end
  private

  def remove_draft(workfile)
    draft = WorkfileDraft.find_by_owner_id_and_workfile_id(current_user.id, workfile.id)
    draft.destroy if draft
  end

  def build_new_file(file_name, content)
    tempfile = Tempfile.new(file_name)
    tempfile.write(content)
    tempfile.close

    ActionDispatch::Http::UploadedFile.new(:filename => file_name, :tempfile => tempfile)
  end
end
