class JobTaskResult < ActiveRecord::Base
  attr_accessible :job_result_id, :name, :started_at, :finished_at, :status, :message
  belongs_to :job_result

  SUCCESS = 'success'; FAILURE = 'failure'
  VALID_STATUSES = [SUCCESS, FAILURE]
  validates :status, :presence => true, :inclusion => {:in => VALID_STATUSES }

  def finish(options)
    self.finished_at = Time.current
    self.assign_attributes options
    self
  end
end
