require "spec_helper"

describe EventPresenter, :type => :view do
  let(:gpdb_data_source) { FactoryGirl.create(:gpdb_data_source) }
  let(:current_user) { users(:owner) }

  before do
    set_current_user(current_user)
  end

  describe "#simple_hash" do
    subject { EventPresenter.new(event, view, options) }
    let(:options) { {} }
    let(:event) { events(:note_on_greenplum) }

    it "has targets and additional_data values in it" do
      hash = subject.simple_hash
      hash[:gpdb_data_source].should be
      hash["body"].should == 'i am a comment with greenplumsearch in me'
    end
  end

  describe "#to_hash" do
    subject { EventPresenter.new(event, view, options) }
    let(:options) { {} }

    context "when rendering the activity stream" do
      let(:options) { {:activity_stream => true} }

      context "SourceTableCreated" do
        let(:event) { FactoryGirl.create(:source_table_created_event, :dataset => datasets(:table)) }
        it "does not render datasets with their schemas or associated workspaces" do
          hash = subject.to_hash
          hash[:dataset][:schema][:id].should == datasets(:table).schema_id
          hash[:dataset][:schema].keys.size.should == 1
          hash[:dataset][:associated_workspaces].should be_empty
        end
      end

      context "NoteOnWorkspace" do
        let(:workspace_with_sandbox) { workspaces(:public) }
        let(:event) { FactoryGirl.create(:note_on_workspace_event, :workspace => workspace_with_sandbox) }

        it "only renders the sandbox id of a workspace" do
          hash = subject.to_hash
          hash[:workspace].should have_key(:id)
          hash[:workspace].should have_key(:name)
          hash[:workspace].should have_key(:is_deleted)
          hash[:workspace].keys.size.should == 3
        end
      end
    end

    context "when rendering notifications" do
      let(:options) { {:read_receipts => true} }

      context "NoteOnWorkspace" do
        let(:workspace_with_sandbox) { workspaces(:public) }
        let(:event) { current_user.notifications.first.event }

        it "renders the event with a :read key based on the current user" do
          hash = subject.to_hash
          hash[:read].should be_false
        end
      end
    end

    context "Non-note event" do
      let(:event) { FactoryGirl.create(:greenplum_instance_created_event, :gpdb_data_source => gpdb_data_source) }

      it "includes the 'id', 'timestamp', 'actor', 'action'" do
        hash = subject.to_hash
        hash[:id].should == event.id
        hash[:timestamp].should == event.created_at
        hash[:action].should == "GreenplumInstanceCreated"
        hash[:actor].should == Presenter.present(event.actor, view)
      end

      it "presents all of the event's 'targets', using the same names" do
        special_instance = FactoryGirl.build(:gpdb_data_source)
        special_user = FactoryGirl.build(:user)

        stub(event).targets do
          {
              :special_instance => special_instance,
              :special_user => special_user
          }
        end

        hash = subject.to_hash
        hash[:special_instance].should == Presenter.present(special_instance, view)
        hash[:special_user].should == Presenter.present(special_user, view)
      end

      it "includes all of the event's 'additional data'" do
        stub(event).additional_data do
          {
              :some_key => "foo",
              :some_other_key => "bar"
          }
        end

        hash = subject.to_hash
        hash[:some_key].should == "foo"
        hash[:some_other_key].should == "bar"
      end
    end

    context "Note event" do
      let(:event) { FactoryGirl.create(:note_on_greenplum_instance_event) }

      it "returns the correct hash for a note" do
        hash = subject.to_hash
        hash[:action].should == "NOTE"
        hash[:action_type].should == "NoteOnGreenplumInstance"
      end

      it "sanitizes notes' body" do
        stub(event).additional_data do
          {
              :body => "<script>foo</script>"
          }
        end

        hash = subject.to_hash
        hash[:body].should_not include('<')
        hash[:body].should_not include('>')
      end

      it "allows links" do
        stub(event).additional_data do
          {
              :body => "<a href='http://google.com'>foo</a>"
          }
        end

        hash = subject.to_hash
        hash[:body].should include('<')
        hash[:body].should include('>')
      end

      context "with an attachment" do
        let(:event) { FactoryGirl.create(:note_on_workspace_event) }
        let(:attachment) { Attachment.first }
        let(:dataset) { datasets(:table) }
        let(:workfile) { workfiles(:public) }

        it "contains the attachment" do
          event.workspace.sandbox = dataset.schema
          event.workspace.save
          stub(event).attachments { [attachment] }
          stub(event).datasets { [dataset] }
          stub(event).workfiles { [workfile] }
          hash = subject.to_hash
          hash[:attachments].should be_present
          hash[:attachments][0][:entity_type].should == 'file'
          hash[:attachments][1][:entity_type].should == 'dataset'
          hash[:attachments][2][:entity_type].should == 'workfile'
          hash[:attachments][1][:workspace].should == event.workspace
          hash[:attachments][1][:type].should == "SANDBOX_TABLE"
        end
      end

      context "with a workfile image attachment" do
        let(:event) { FactoryGirl.create(:note_on_workspace_event) }
        let(:workfile) { Workfile.find_by_file_name("image.png") }

        it "contains the images icon url" do
          event.workspace.save
          stub(event).workfiles { [workfile] }
          hash = subject.to_hash
          hash[:attachments].should be_present
          hash[:attachments][0][:entity_type].should == 'workfile'
          hash[:attachments][0][:version_info][:icon_url].should =~ /\/workfile_versions\/.*image\?style=icon/
        end
      end
    end

    context "Event with comments" do
      let(:event) { events(:note_on_greenplum) }

      it "has a comments array on it" do
        hash = subject.to_hash
        hash[:comments].should_not be_nil
      end

      it "has correct formatting of comments" do
        hash = subject.to_hash
        hash[:comments].count.should > 1
        hash[:comments].each do | comment |
          comment[:body].should_not be_nil
          comment[:author].should_not be_nil
        end
      end
    end

    context "events that are insight" do
      let(:event) { events(:note_on_greenplum) }
      let(:user) { users(:owner) }

      before do
        event.insight = true
        event.promoted_by = user
        event.promotion_time = Time.current()
      end

      it "has hash for insights" do
        hash = subject.to_hash
        hash[:is_insight].should be_true
        hash[:promoted_by].should == Presenter.present(user, view)
        hash[:promotion_time].should == event.promotion_time
        hash[:is_published].should == false
      end

      context "insights that are published" do
        before do
          event.published = true
        end

        it "should be published" do
          hash = subject.to_hash
          hash[:is_published].should == true
        end
      end
    end

    context "events with errors" do
      let(:event) { events(:import_failed_with_model_errors) }
      let(:user) { users(:owner) }

      it "presents the errors" do
        hash = subject.to_hash
        hash['error_objects'].should == ErrorPresenter.new(event.error_objects).as_json
      end
    end
  end
end
