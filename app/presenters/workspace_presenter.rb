class WorkspacePresenter < Presenter

  def to_hash
    results = {
      :id => model.id,
      :name => model.name,
      :is_deleted => model.deleted?,
      :entity_type => model.entity_type_name,
      :summary => sanitize(model.summary),
      :archived_at => model.archived_at,
      :permission => model.permissions_for(current_user),
      :is_member => model.member?(current_user),
      :owner => present(model.owner),
      :public => model.public,
      :is_project => model.is_project
    }

    unless succinct?
      results.merge!(
        :archiver => present(model.archiver),
        :image => present(model.image),
        :has_added_member => model.has_added_member,
        :has_added_workfile => model.has_added_workfile,
        :has_added_sandbox => model.has_added_sandbox,
        :has_changed_settings => model.has_changed_settings,
        :tags => present(model.tags, @options),
        :sandbox_info => present(model.sandbox, options.merge(:succinct => true)),
        :show_sandbox_datasets => model.show_sandbox_datasets
      )
    end

    results.merge!(latest_comments_hash)
    results
  end

  def complete_json?
    !succinct?
  end

  private

  def latest_comments_hash
    return {} unless @options[:show_latest_comments]
    recent_notes = model.owned_notes.recent
    recent_comments = model.comments.recent

    recent_insights = recent_notes.where(:insight => true)

    recent_notes_and_comments = recent_notes.order("updated_at desc").limit(5) + recent_comments.order("updated_at desc").limit(5)

    latest_5 = recent_notes_and_comments.sort_by(&:updated_at).last(5)

    {
      :number_of_insights => recent_insights.size,
      :number_of_comments => recent_notes.size + recent_comments.size - recent_insights.size,
      :latest_comment_list => present(latest_5),
      :latest_insight => present(recent_insights.order("updated_at desc").first)
    }
  end
end
