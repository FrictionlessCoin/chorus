def current_user_id
  evaluate_script "chorus.session.user().id"
end

def current_user
  User.find(current_user_id)
end

def fill_user_form(params = {})
  wait_for_ajax
  first_name = Forgery::Name.first_name
  last_name = Forgery::Name.last_name
  fill_in 'firstName', :with => params[:first_name] || first_name
  fill_in 'lastName', :with => params[:last_name] || last_name
  username = "#{params[:first_name] || first_name}#{params[:last_name] || last_name}"
  fill_in 'username', :with => params[:username] || username
  fill_in 'email', :with => "#{params[:username] || username}@email.com"
  fill_in 'password', :with => "secret"
  fill_in 'passwordConfirmation', :with => "secret"
  fill_in 'dept', :with => params[:department] ||Forgery::Name.industry
  fill_in 'title', :with => params[:title] ||Forgery::Name.title
end

def create_valid_user(params = {})
  create_new_user_page
  wait_for_ajax
  fill_user_form(params)
  page.find("button[type=submit]").click
  wait_until { current_route == "/users" }
end

def as_user(username)
  logout
  login(username, 'secret')
  yield
  logout
end