require 'will_paginate/array'

class ModelNotCreated < StandardError
end

class SunspotError < StandardError
end

class ApplicationController < ActionController::Base
  around_filter :set_current_user
  before_filter :require_login
  before_filter :set_collection_defaults, :only => :index
  before_filter :extend_expiration
  rescue_from 'ActiveRecord::RecordNotFound', :with => :render_not_found
  rescue_from 'ActiveRecord::RecordInvalid', :with => :render_not_valid
  rescue_from 'ApiValidationError', :with => :render_not_valid
  rescue_from 'SecurityTransgression', :with => :render_security_transgression
  rescue_from 'ActiveRecord::JDBCError', :with => :render_unprocessable_entity
  rescue_from 'ActiveRecord::StatementInvalid', :with => :render_unprocessable_entity
  rescue_from 'Gpdb::InstanceStillProvisioning', :with => :render_instance_still_provisioning_error
  rescue_from 'Gpdb::InstanceOverloaded', :with => :render_instance_overloaded_error
  rescue_from 'Gpdb::InstanceUnavailable', :with => :render_instance_unavailable_error
  rescue_from 'MultipleResultsetQuery::QueryError', :with => :render_query_error
  rescue_from 'Allowy::AccessDenied', :with => :render_forbidden
  rescue_from 'Gpdb::CantCreateView', :with => :render_query_error
  rescue_from 'Gpdb::ViewAlreadyExists', :with => :render_query_error
  rescue_from 'ModelNotCreated', :with => :render_model_error
  rescue_from 'Hdfs::DirectoryNotFoundError', :with => :render_not_found
  rescue_from 'SunspotError', :with => :render_unprocessable_entity

  helper_method :current_user

  def head(status, options = {})
    if (status == :ok && request.accepts.first == 'application/json')
      render :text => "{}"
    else
      super
    end
  end

  private

  def set_current_user
    Thread.current[:user] = User.find_by_id(session[:user_id])
    yield
    Thread.current[:user] = nil
  end

  def render_not_valid(e)
    present_validation_errors e.record.errors, :status => :unprocessable_entity
  end

  def render_unprocessable_entity(e)
    present_errors({:message => e.message}, :status => :unprocessable_entity)
  end

  def render_query_error(e)
    present_errors({:fields => {:query => {:INVALID => {:message => e.to_s}}}}, :status => :unprocessable_entity)
  end

  def render_model_error(e)
    present_errors({:fields => {:general =>
                                    { :GENERIC => {:message => e.message}}}},
                   {:status => :unprocessable_entity})
  end

  def render_instance_still_provisioning_error(e)
    present_errors({:record => :INSTANCE_STILL_PROVISIONING}, :status => :unprocessable_entity)
  end

  def render_instance_overloaded_error(e)
    present_errors({:record => :INSTANCE_OVERLOADED}, :status => :unprocessable_entity)
  end

  def render_instance_unavailable_error(e)
    present_errors({:record => :INSTANCE_UNAVAILABLE}, :status => :unprocessable_entity)
  end

  def render_not_found(e)
    present_errors({:record => :NOT_FOUND}, :status => :not_found)
  end

  def render_security_transgression(e)
    head :forbidden
  end

  def render_forbidden(e = nil)
    present_forbidden(e.try(:subject))
  end

  def logged_in?
    !!current_user
  end

  def current_user
    Thread.current[:user]
  end

  def check_expiration
    head(:unauthorized) if expired?
  end

  def expired?
    !session[:expires_at] || session[:expires_at] < Time.current
  end

  def extend_expiration
    force_extend_expiration unless expired?
  end

  def force_extend_expiration
    session[:expires_at] = ChorusConfig.instance['session_timeout_minutes'].minutes.from_now
  end

  def require_login
    head :unauthorized unless logged_in?
    check_expiration
  end

  def require_admin
    render_forbidden unless logged_in? && current_user.admin?
  end

  def require_admin_or_referenced_user
    head :not_found unless logged_in? && (current_user.admin? || current_user == @user)
  end

  def set_collection_defaults
    params.reverse_merge!(Chorus::Application.config.collection_defaults)
  end

  def present(model_or_collection, options={})
    presenter_options = options.delete(:presenter_options) || {}
    json = {:response => Presenter.present(model_or_collection, view_context, presenter_options) }

    if model_or_collection.respond_to? :current_page
      json[:pagination] = {
        :page => model_or_collection.current_page,
        :per_page => model_or_collection.per_page,
        :records => model_or_collection.total_entries,
        :total => model_or_collection.per_page > 0 ? model_or_collection.total_pages : nil
      }
    end

    render options.merge({:json => json})
  end

  def paginate(collection)
    collection.paginate(params.slice(:page, :per_page, :total_entries))
  end

  def present_forbidden(model)
    response_json = {}

    if model
      response_json[:response] = {
        model.class.name.underscore => { :id => model.id }
      }
    end

    render :json => response_json, :status => :forbidden
  end

  def present_errors(errors, options={})
    render options.reverse_merge(:status => :bad_request).merge(:json => {:errors => errors})
  end

  def present_validation_errors(errors, options={})
    present_errors({:fields => ErrorPresenter.new(errors)}, options)
  end

  def self.require_params(*params_to_check)
    options = params_to_check.last.is_a?(Hash) ? params_to_check.pop : {}
    before_filter options do
      raise_unless_params(params_to_check, options)
    end
  end

  def raise_unless_params(params_to_check, options)
    params_to_check.each do |param|
      raise ApiValidationError.new(options[:field_name] || param, :blank) if params[param].blank?
    end
  end
end
