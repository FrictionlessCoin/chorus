require File.join(File.dirname(__FILE__), 'spec_helper')

describe "save as Menu" do
  before do
    login('edcadmin', 'secret')
    visit("#/workspaces")
    wait_until { current_route == '/workspaces' && page.has_selector?("button[data-dialog=WorkspacesNew]") }

    click_button "Create Workspace"
    within("#facebox") do
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
    wait_until {
        !!evaluate_script('chorus.page.mainContent && chorus.page.mainContent.content && chorus.page.mainContent.content.textContent && chorus.page.mainContent.content.textContent.editor && !!chorus.page.mainContent.content.textContent.editor.setValue')
    }
  end

  it "pops up the right menu" do
    page.should have_no_css(".components_menu a[data-menu-name='new']")
    page.should have_no_css(".components_menu a[data-menu-name='replace']")
    page.find(".save .save_file_as").click
    wait_until { page.find(".qtip[aria-hidden=false]") }
    page.find(".components_menu a[data-menu-name='new']").should be_visible
    page.find(".components_menu a[data-menu-name='replace']").should be_visible
  end

  it "click the save as replace version" do
    page.execute_script('chorus.page.mainContent.content.textContent.editor.setValue("new Blood")')
    page.find(".save .save_file_as").click
    wait_until { page.find(".qtip[aria-hidden=false]") }
    page.find(".components_menu a[data-menu-name='replace']").click
    wait_until { page.find(".qtip[aria-hidden=true]") }
    page.find("textarea.text_editor").should have_content('new Blood')
    click_link "Work Files"
    wait_until { current_route =~ /workspaces\/\d+\/workfiles/ }
    click_link @file_name
    wait_until { current_route =~ /workspaces\/\d+\/workfiles\/\d+/ }
    page.find("textarea.text_editor").should have_content('new Blood')
  end

  it "click the save as new  version" do
    page.execute_script('chorus.page.mainContent.content.textContent.editor.setValue("new Blood -2")')
    page.find(".save .save_file_as").click
    wait_until { page.find(".qtip[aria-hidden=false]") }
    page.find(".components_menu a[data-menu-name='new']").click
    wait_until { page.find(".qtip[aria-hidden=true]") }
    fill_in 'commitMessage', :with => "commit Message -2"
    click_button "Save New Version"
    wait_until { current_route =~ /workspaces\/\d+\/workfiles\/\d+/ }
    page.find("textarea.text_editor").should have_content('new Blood -2')
  end

  it "open the specific version" do
    page.execute_script('chorus.page.mainContent.content.textContent.editor.setValue("new Blood")')
    page.find(".save .save_file_as").click
    wait_until { page.find(".qtip[aria-hidden=false]") }
    page.find("a[data-menu-name=replace]").click
    wait_until { page.find(".qtip[aria-hidden=true]") }
    wait_until { current_route =~ /workspaces\/\d+\/workfiles\/\d+/ }

    page.execute_script('chorus.page.mainContent.content.textContent.editor.setValue("new Blood -2")')
    page.find(".save .save_file_as").click
    wait_until { page.find("a[data-menu-name='new']") }
    sleep 0.5
    page.find(".components_menu a[data-menu-name='new']").click
    wait_until { page.find(".qtip[aria-hidden=true]") }
    fill_in 'commitMessage', :with => "commit Message -2"
    click_button "Save New Version"
    wait_until { current_route =~ /workspaces\/\d+\/workfiles\/\d+/ }

    page.find("a.version_list").click
    wait_until { page.find(".qtip[aria-hidden=false]") }
    page.find(".workfile_version_list li:last-child a").click
    wait_until { current_route =~ /workspaces\/\d+\/workfiles\/\d+\/versions\/\d+/ }
    page.find("textarea.text_editor").should have_content('new Blood')
  end
end
