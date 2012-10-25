class Search
  include ActiveModel::Validations
  attr_accessor :query, :page, :per_page, :workspace_id, :search_type
  attr_reader :models_to_search, :per_type, :current_user

  validate :valid_entity_type

  def initialize(current_user, params = {})
    @current_user = current_user
    @models_to_search = [User, GpdbInstance, HadoopInstance, GnipInstance, Workspace, Workfile, Dataset, HdfsEntry, Attachment] unless @models_to_search.present?
    self.query = params[:query]
    self.per_type = params[:per_type]
    self.workspace_id = params[:workspace_id]
    self.search_type = params[:search_type]
    if per_type
      self.per_page = 100
    else
      self.page = params[:page] || 1
      self.per_page = params[:per_page] || 50
    end
    self.entity_type = params[:entity_type]
  end

  def search
    return @search if @search
    raise ApiValidationError.new(errors) unless valid?

    build_search

    @search.execute
    @search
  end

  def build_search
    @search = Sunspot.new_search(*(models_to_search + [Events::Note, Comment])) do
      group :grouping_id do
        limit 3
        truncate
      end
      fulltext query do
        highlight :max_snippets => 100
      end
      paginate :page => page, :per_page => per_page

      if count_using_facets?
        facet :type_name
      end

      with :type_name, type_names_to_search
    end
    models_to_search.each do |model_to_search|
      model_to_search.add_search_permissions(current_user, @search) if model_to_search.respond_to? :add_search_permissions
    end
  end

  def models
    return @models if @models
    @models = Hash.new() { |hsh, key| hsh[key] = [] }

    search.associate_grouped_notes_with_primary_records

    search.results.each do |result|
      model_key = class_name_to_key(result.type_name)
      @models[model_key] << result unless per_type && @models[model_key].length >= per_type
    end

    populate_missing_records

    populate_workspace_specific_results

    @models
  end

  def users
    models[:users]
  end

  def instances
    models[:instances]
  end

  def workspaces
    models[:workspaces]
  end

  def workfiles
    models[:workfiles]
  end

  def datasets
    models[:datasets]
  end

  def hdfs_entries
    models[:hdfs_entries]
  end

  def attachments
    models[:attachments]
  end

  def this_workspace
    models[:this_workspace]
  end

  def num_found
    return @num_found if @num_found

    @num_found = Hash.new(0)
    if count_using_facets?
      search.facet(:type_name).rows.each do |facet|
        @num_found[class_name_to_key(facet.value)] = facet.count
      end
    else
      @num_found[class_name_to_key(models_to_search.first.type_name)] = search.group(:grouping_id).total
    end

    populate_workspace_specific_results

    @num_found
  end

  def per_type=(new_type)
    new_type_as_int = new_type.to_i
    if new_type_as_int > 0
      @per_type = new_type_as_int
    end
  end

  def entity_type=(new_type)
    return unless new_type
    models_to_search.select! do |model|
      class_name_to_key(model.type_name) == class_name_to_key(new_type)
    end
  end

  def workspace
    @_workspace ||= Workspace.find(workspace_id)
  end

  private

  def count_using_facets?
    type_names_to_search.length > 1
  end

  def class_name_to_key(name)
    name.to_s.underscore.pluralize.to_sym
  end

  def populate_missing_records
    return unless per_type

    type_names_to_search.each do |type_name|
      model_key = class_name_to_key(type_name)
      found_count = models[model_key].length
      if found_count < per_type && found_count < num_found[model_key]
        model_search = Search.new(current_user, :query => query, :per_page => per_type, :entity_type => type_name)
        models[model_key] = model_search.models[model_key]
      end
    end
  end

  def type_names_to_search
    models_to_search.map(&:type_name).uniq
  end

  def populate_workspace_specific_results
    return unless workspace_id.present?
    return if models.has_key? :this_workspace
    workspace_search = WorkspaceSearch.new(current_user, :workspace_id => workspace_id, :per_page => per_type, :query => query)
    models[:this_workspace] = workspace_search.results
    num_found[:this_workspace] = workspace_search.num_found
  end

  def valid_entity_type
    errors.add(:entity_type, :invalid_entity_type) if models_to_search.blank?
  end

end