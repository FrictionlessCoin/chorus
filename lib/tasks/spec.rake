unless Rails.env.production?
  task :default => [:spec]

  task :gpdb_host_check_stale do
    `echo "#{ENV['GPDB_HOST']}" > tmp/GPDB_HOST_STALE`
  end

  # remove default rspec_rails tasks and prereqs to start clean (because it assumes the database is test)
  Rake::Task["spec"].clear
  spec_prereq = if Rails.env.test?
    "db:test:clone_structure"
  else
    :noop
  end
  task :noop

  desc 'Run backend specs'
  RSpec::Core::RakeTask.new(:spec => spec_prereq) do |t|
    t.pattern = 'spec/{controllers,permissions,models,lib,presenters,requests,services,install}/**/*_spec.rb'
  end
  task :spec => [:gpdb_host_check_stale]

  desc 'Run legacy migration specs'
  RSpec::Core::RakeTask.new('spec:legacy_migration') do |t|
    t.pattern = 'spec/legacy_migration/**/*_spec.rb'
  end

  desc 'Run all backend specs including legacy migration and api doc specs'
  task :all => [:spec, :api_docs, 'spec:legacy_migration']

  desc 'Run Capybara integration specs'
  RSpec::Core::RakeTask.new('spec:integration') do |t|
    t.pattern = 'spec/integration/**/*_spec.rb'
  end
  task :spec => [:gpdb_host_check_stale]
end