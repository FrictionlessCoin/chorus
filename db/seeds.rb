# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rake db:seed (or created alongside the db with db:setup).
#
# Examples:
#
#   cities = City.create([{ :name => 'Chicago' }, { :name => 'Copenhagen' }])
#   Mayor.create(:name => 'Emanuel', :city => cities.first)
require 'user'

unless User.where(:username => "edcadmin").present?
  puts "Creating edcadmin user..."
  user = User.new(
    :username => "edcadmin",
    :first_name => "EDC",
    :last_name => "Admin",
    :email => "edcadmin@example.com",
    :password => "secret",
    :password_confirmation => "secret"
  )
  user.admin = true
  user.save!
end
