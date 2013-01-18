require File.join(File.dirname(__FILE__), 'spec_helper')

describe "Workfiles" do

  let(:workspace) { workspaces(:public) }

  describe "add a workfile" do
    it "creates a simple workfile" do
      login(users(:admin))
      visit("#/workspaces/#{workspace.id}")

      click_link "Work Files"
      click_button "Create SQL File"
      wf_name = "sql_wf_new"
      within_modal do
        fill_in 'fileName', :with => wf_name
        click_button "Add SQL File"
      end
      page.should have_content (wf_name)
      workspace.workfiles.find_by_file_name("#{wf_name}.sql").should_not be_nil
    end

    it "uploads a workfile from the local system" do
      login(users(:admin))
      visit("#/workspaces/#{workspace.id}")

      click_link "Work Files"
      click_button("Upload File")
      within_modal do
        attach_file("workfile[versions_attributes][0][contents]", File.join(File.dirname(__FILE__), '../fixtures/some.txt'))
        click_button("Upload File")
      end
      find('.sub_nav a', :text => "Work Files").click
      page.should have_content "some.txt"
      workspace.workfiles.find_by_file_name("some.txt").should_not be_nil
    end
  end

  describe "Deleting workfiles" do
    let(:workfile) { workfiles(:'sql.sql') }

    it "deletes an uploaded file from the show page" do
      login(users(:admin))
      visit("#/workspaces/#{workspace.id}")

      click_link "Work Files"
      click_link workfile.file_name
      click_link "Delete work file"

      within_modal do
        click_button "Delete work file"
      end
      page.should_not have_content(workfile.file_name)
      Workfile.find_by_id(workfile.id).should be_nil
    end
  end

  describe "workfiles list page" do
    let(:workfile_first_by_date) { workspace.workfiles.order(:updated_at).first }
    let(:workfile_last_by_date) { workspace.workfiles.order(:updated_at).last }

    describe "Lists the work files" do
      before(:each) do
        login(users(:admin))
        visit("#/workspaces/#{workspace.id}/workfiles")
      end

      it "Lists the work files by updated date when selected" do
        find('a', :text => "Alphabetically", :visible => true).click
        find('a', :text => "By Date", :visible => true).click
        find('.workfile_list_sidebar .fileName').should have_content(workfile_first_by_date.file_name)
        workfiles = page.all("li.workfile")
        workfiles.first.text.should include workfile_first_by_date.file_name
        workfiles.last.text.should include workfile_last_by_date.file_name
      end
    end
  end
end
