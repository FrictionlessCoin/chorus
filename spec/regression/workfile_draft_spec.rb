require File.join(File.dirname(__FILE__), 'spec_helper')

describe "Workfile drafts" do
  def wait_for_text_element
    wait_until do
        !!evaluate_script('chorus.page.mainContent && chorus.page.mainContent.content && chorus.page.mainContent.content.textContent && chorus.page.mainContent.content.textContent.editor && !!chorus.page.mainContent.content.textContent.editor.setValue')
    end
  end

  before :each do
    login('edcadmin', 'secret')
    visit("#/workspaces")
    wait_until { current_route == '/workspaces' && page.has_selector?("button[data-dialog=WorkspacesNew]") }

    click_button "Create Workspace"
    within_modal do
      fill_in 'name', :with => "partyman#{Time.now.to_i}"
      click_button "Create Workspace"
    end
    wait_until { current_route =~ /workspaces\/\d+/ }

    click_link "Work Files"
    wait_until { current_route =~ /workspaces\/\d+\/workfiles/ }

    click_button "Create SQL File"
    @file_name = "wicked_data#{Time.now.to_i}"
    fill_in 'fileName', :with => @file_name
    click_button "Add SQL File"
    wait_until { current_route =~ /workspaces\/\d+\/workfiles\/\d+/ }
    wait_for_text_element
  end

  it "should open the text editor for the draft" do
    page.execute_script('chorus.page.mainContent.content.textContent.editor.setValue("new Blood -1")')
    click_link "Work Files"
    wait_until { current_route =~ /workspaces\/\d+\/workfiles/ }
    click_link @file_name
    wait_until { current_route =~ /workspaces\/\d+\/workfiles\/\d+/ }
    within_modal do
      click_button 'Open Draft'
    end
    wait_until { current_route =~ /workspaces\/\d+\/workfiles\/\d+/ }
    page.find("textarea.text_editor").should have_content('new Blood -1')
  end

  it "content should be of last version" do
    wait_for_text_element
    page.execute_script('chorus.page.mainContent.content.textContent.editor.setValue("new Blood")')
    page.find(".save .save_file_as").click
    wait_until { page.find(".qtip[aria-hidden=false]") }
    page.find("a[data-menu-name=replace]").click
    wait_until { page.find(".qtip[aria-hidden=true]") }
    page.find("textarea.text_editor").should have_content('new Blood')
    click_link "Work Files"
    click_link @file_name
    wait_until { current_route =~ /workspaces\/\d+\/workfiles\/\d+/ }
    wait_for_text_element
    page.execute_script('chorus.page.mainContent.content.textContent.editor.setValue("new Blood -1")')
    click_link "Work Files"
    wait_until { current_route =~ /workspaces\/\d+\/workfiles/ }
    click_link @file_name
    wait_until { current_route =~ /workspaces\/\d+\/workfiles\/\d+/ }
    click_button 'Open Saved Version'
    wait_until { current_route =~ /workspaces\/\d+\/workfiles\/\d+/ }
    page.find("textarea.text_editor").should have_content('new Blood')
  end
end