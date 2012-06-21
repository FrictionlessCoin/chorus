require File.join(File.dirname(__FILE__), 'spec_helper')

describe "Viewing data inside GPDB instances" do
  before(:each) do
    login('edcadmin', 'secret')
  end

  it "can preview a table" do
    create_gpdb_gillette_instance(:name => "InstanceToPreviewData")
    click_link "InstanceToPreviewData"
    click_link "Analytics"
    click_link "analytics"

    table_id = Instance.find_by_name("InstanceToPreviewData").databases.find_by_name("Analytics").schemas.find_by_name("analytics").datasets.find_by_name("a1000").id

    page.find("li[data-database-object-id='#{table_id}']").click
    click_link "Preview Data"
    within(".data_table") do
      page.should have_selector(".th")
    end
  end

  it "can view a tables statistics and metadata" do
    create_gpdb_gillette_instance(:name => "InstanceToViewStatistics1")
    click_link "InstanceToViewStatistics1"
    click_link "Analytics"
    click_link "analytics"

    dataset_id = Instance.find_by_name("InstanceToViewStatistics1").databases.find_by_name("Analytics").schemas.find_by_name("analytics").datasets.find_by_name("a1000").id

    page.find("li[data-database-object-id='#{dataset_id}']").click

    within "#sidebar" do
      page.find("li[data-name='statistics']").click
    end

    within ".statistics_detail" do
      # TODO we can't make assertions about things that change such as last_analyzed and disk_size
      page.should have_content("Source Table")
      page.should have_content("Columns 5")
      page.text.should =~ /Rows \d+/
    end
  end

  it "can view a views statistics, metadata and definition" do
    create_gpdb_gillette_instance(:name => "InstanceToViewStatistics2")
    click_link "InstanceToViewStatistics2"
    click_link "Analytics"
    click_link "analytics"

    dataset_id = Instance.find_by_name("InstanceToViewStatistics2").databases.find_by_name("Analytics").schemas.find_by_name("analytics").datasets.find_by_name("___lenny").id

    page.find("li[data-database-object-id='#{dataset_id}']").click

    within "#sidebar" do
      page.find("li[data-name='statistics']").click
    end

    within ".statistics_detail" do
      page.should have_content("Source View")
      page.should have_content("Columns 2")
      page.should have_content("Description This is the comment on view - __lenny")
    end

    within(".content") do
      click_link("___lenny")
    end

    within ".definition" do
      page.should have_content("SELECT a.artist, a.title FROM top_1_000_songs_to_hear_before_you_die a;")
    end
  end

  it "should let the user preview the data on the table from the instance browser" do

     create_gpdb_gillette_instance(:name => "data_preview")
     go_to_instance_page
     click_link "data_preview"
     click_link "Analytics"
     click_link "public"
     click_link "1000_songs_test_1"
     click_button "Data Preview"
     within (".execution") do
       page.should have_content ("Data Preview")
       find(".close").visible?
       find(".download_csv").visible?
       wait_for_ajax
       click_link "Close"
     end

  end

end
