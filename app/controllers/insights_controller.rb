require Rails.root + 'app/permissions/insight_access'

class InsightsController < ApplicationController
  wrap_parameters :insight, :exclude => []
  
  def promote
    note = get_note_if_visible(params[:insight][:note_id])
    raise SecurityTransgression unless note
    note.promote_to_insight current_user
    present note, :status => :created
  end

  def publish
    note = get_note_if_visible(params[:insight][:note_id])
    raise SecurityTransgression unless note
    raise ApiValidationError.new(:base, :generic, {:message => "Note has to be an insight first"}) unless note.insight
    note.set_insight_published true
    present note, :status => :created
  end

  def unpublish
    note = Events::Note.find(params[:insight][:note_id])
    authorize! :update, note
    raise ApiValidationError.new(:base, :generic, {:message => "Note has to be published first"}) unless note.published
    note.set_insight_published false
    present note, :status => :created
  end

  def index
    params[:entity_type] ||= 'dashboard'
    present paginate(get_insights), :presenter_options => {:activity_stream => true}
  end

  def count
    params[:entity_type] ||= 'dashboard'
    insight_count = get_insights.count
    insight_count = insight_count.keys.count unless insight_count.is_a?(Fixnum)
    render :json => {response: { number_of_insight: insight_count } }
  end

  private

  def get_insights
    insight_query = Events::Base.where(insight: true).order("events.id DESC")

    if params[:entity_type] == "workspace"
      workspace = Workspace.find(params[:entity_id])
      insight_query = insight_query.where(workspace_id: workspace.id)
    end

    if (workspace && !workspace.public?) || params[:entity_type] != "workspace"
      insight_query = insight_query.visible_to(current_user) unless current_user.admin?
    end

    insight_query = insight_query.includes(Events::Base.activity_stream_eager_load_associations)
    insight_query
  end

   def get_note_if_visible(note_id)
    note_query = Events::Note.where(id: note_id)
    note_query = note_query.visible_to(current_user) unless current_user.admin?
    note_query.first
  end
end
