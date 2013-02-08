require "spec_helper"

describe Search do
  let(:user) { users(:owner) }

  describe ".new" do
    it "takes current user and search params" do
      search = Search.new(user, :query => 'fries')
      search.current_user.should == user
      search.query.should == 'fries'
    end
  end

  describe "#valid" do
    it "is not valid without a valid entity_type" do
      search = Search.new(user, :query => 'fries', :entity_type => 'potato')
      search.should_not be_valid
      search.should have_error_on(:entity_type).with_message(:invalid_entity_type)
    end

    it "raises ApiValidationError when search is invalid" do
      search = Search.new(user, :query => 'fries')
      stub(search).valid? { false }
      expect {
        search.search
      }.to raise_error(ApiValidationError)
    end
  end

  describe "#search" do
    it "searches for all types with query" do
      search = Search.new(user, :query => 'bob')
      search.search
      Sunspot.session.should be_a_search_for(User)
      Sunspot.session.should be_a_search_for(GpdbDataSource)
      Sunspot.session.should be_a_search_for(HadoopInstance)
      Sunspot.session.should be_a_search_for(GnipInstance)
      Sunspot.session.should be_a_search_for(Workspace)
      Sunspot.session.should be_a_search_for(Workfile)
      Sunspot.session.should be_a_search_for(Dataset)
      Sunspot.session.should be_a_search_for(HdfsEntry)
      Sunspot.session.should be_a_search_for(Attachment)
      Sunspot.session.should be_a_search_for(Events::Note)
      Sunspot.session.should be_a_search_for(Comment)
      Sunspot.session.should have_search_params(:fulltext, 'bob')
      Sunspot.session.should have_search_params(:facet, :type_name)
      Sunspot.session.should have_search_params(:group, Proc.new {
        group :grouping_id do
          truncate
          limit 3
        end
      })
    end

    it "supports pagination" do
      search = Search.new(user, :query => 'bob', :page => 4, :per_page => 42)
      search.search
      Sunspot.session.should have_search_params(:paginate, :page => 4, :per_page => 42)
    end

    context "when limiting the number of records per type" do
      it "performs secondary searches to pull back needed records" do
        any_instance_of(Sunspot::Search::AbstractSearch) do |search|
          stub(search).group_response { {} }
        end
        search = Search.new(user, :query => 'bob', :per_type => 3)
        stub(search).num_found do
          hsh = Hash.new(0)
          hsh.merge({:users => 100, :instances => 100, :workspaces => 100, :workfiles => 100, :datasets => 100, :hdfs_entries => 100, :attachments => 100})
        end
        stub(search.search).each_hit_with_result { [] }
        search.models
        types_to_search = search.models_to_search.inject(ActiveSupport::OrderedHash.new) do |hash, model|
          hash[model.type_name] ||= []
          hash[model.type_name] << model
          hash
        end
        Sunspot.session.searches.length.should == types_to_search.keys.length + 1
        types_to_search.each_with_index do |type_and_model, index|
          models = type_and_model.last
          sunspot_search = Sunspot.session.searches[index+1]
          models.each do |model|
            sunspot_search.should be_a_search_for(model)
          end
          (search.models_to_search - models).each do |other_model|
            sunspot_search.should_not be_a_search_for(other_model)
          end
          sunspot_search.should have_search_params(:fulltext, 'bob')
          sunspot_search.should have_search_params(:paginate, :page => 1, :per_page => 3)
          sunspot_search.should_not have_search_params(:facet, :type_name)
        end
      end

      it "ignores pagination" do
        search = Search.new(user, :query => 'bob', :per_type => 3, :page => 2, :per_page => 5)
        search.search
        Sunspot.session.should have_search_params(:paginate, :page => 1, :per_page => 100)
      end

      it "raises an error if solr does not work properly" do
        search = Search.new(user, :query => 'bob', :per_type => 3, :page => 2, :per_page => 5)
        stub(search).build_search {
          raise SunspotError.new("error")
        }
        expect { search.search }.to raise_error(SunspotError)
      end
    end

    context "when limiting the type of model searched" do
      it "searches only the specified model type" do
        search = Search.new(user, :query => 'bob', :entity_type => 'instance')
        search.search
        Sunspot.session.should_not be_a_search_for(User)
        Sunspot.session.should be_a_search_for(GpdbDataSource)
        Sunspot.session.should be_a_search_for(HadoopInstance)
        Sunspot.session.should be_a_search_for(GnipInstance)
      end

      it "creates a search session just for that model" do
        search = Search.new(user, :query => 'bob', :entity_type => 'user')
        search.search
        Sunspot.session.should be_a_search_for(User)
        Sunspot.session.should_not be_a_search_for(GpdbDataSource)
        Sunspot.session.should have_search_params(:fulltext, 'bob')
        Sunspot.session.should_not have_search_params(:facet, :type_name)
      end
    end

    context "when searching datasets with no instance accounts accessible to the user" do
      it "does not include the condition for instance accounts" do
        stub(user).accessible_account_ids { [] }
        Search.new(user, :query => 'whatever', :entity_type => :dataset).search
        Sunspot.session.should have_search_params(:with, Proc.new {
          any_of do
            without :security_type_name, Dataset.security_type_name
          end
        })
      end
    end

    describe "search with a specific model" do
      it "only searches for that model" do
        search = Search.new(user, :query => 'bob', :entity_type => 'user')
        search.search
        session = Sunspot.session
        session.should be_a_search_for(User)
        session.should_not be_a_search_for(GpdbDataSource)
        session.should have_search_params(:fulltext, 'bob')
        session.should_not have_search_params(:facet, :type_name)
      end
    end

    describe "with a workspace_id" do
      let(:search) { Search.new(user, :query => 'bob', :per_type => 3, :workspace_id => 7) }

      before do
        any_instance_of(Sunspot::Search::AbstractSearch) do |search|
          stub(search).group_response { {} }
        end
        search.models
      end

      it "performs a secondary search to pull back workfiles and datasets within the workspace" do
        Sunspot.session.searches.length.should == 2
        last_search = Sunspot.session.searches.last
        last_search.should be_a_search_for(Dataset)
        last_search.should be_a_search_for(Workfile)
        last_search.should be_a_search_for(Workspace)
        last_search.should_not be_a_search_for(User)
        last_search.should have_search_params(:with, :workspace_id, 7)
      end

      it "limits the results to a max of per_page" do
        Sunspot.session.searches.last.should have_search_params(:paginate, :page => 1, :per_page => 3)
      end

      it "searches for the same query" do
        Sunspot.session.searches.last.should have_search_params(:fulltext, 'bob')
      end

      it "does not perform the workspace search more than once" do
        search.num_found
        Sunspot.session.searches.length.should == 2
      end

      context "when filtering by some entity type" do
        let(:search) { Search.new(user, :query => 'view', :workspace_id => 7, :entity_type => 'dataset') }

        it "limits the results to a specific entity_type" do
          last_search = Sunspot.session.searches.last
          last_search.should be_a_search_for(Dataset)
          last_search.should_not be_a_search_for(Workspace)
        end
      end
    end

    describe "tag search" do
      let(:tag) { ActsAsTaggableOn::Tag.named("alpha").first }
      let(:params) { { :tag => true, :query => tag.name } }
      let(:search) { Search.new(user, params) }

      before do
        any_instance_of(Sunspot::Search::AbstractSearch) do |search|
          stub(search).group_response { {} }
        end
      end

      it "filters by tag_id" do
        search.models
        Sunspot.session.should have_search_params(:with, :tag_ids, tag.id)
        Sunspot.session.should_not have_search_params(:fulltext, tag.name)
      end

      it "orders by sort_name" do
        search.models
        Sunspot.session.should have_search_params(:order_by, :sort_name)
      end

      describe "with a workspace_id" do
        let(:search) { Search.new(user, params.merge(:workspace_id => 7)) }

        it "performs a secondary search to pull back workfiles and datasets within the workspace" do
          search.models
          Sunspot.session.searches.length.should == 2
          last_search = Sunspot.session.searches.last
          last_search.should have_search_params(:with, :workspace_id, 7)
          last_search.should have_search_params(:with, :tag_ids, tag.id)
          last_search.should_not have_search_params(:fulltext, tag.name)
        end
      end

      context "when tag does not exist" do
        let(:search) { Search.new(user, :tag => true, :query => 'i am not a tag') }

        it "returns empty results" do
          search.models.values.flatten.should be_empty
        end
      end
    end
  end

  context "with solr enabled" do
    let(:admin) { users(:admin) }
    let(:owner) { users(:owner) }
    let(:the_collaborator) { users(:the_collaborator) }
    let(:gpdb_data_source) { data_sources(:default) }
    let(:hadoop_instance) { hadoop_instances(:hadoop) }
    let(:gnip_instance) { gnip_instances(:default) }
    let(:hdfs_entry) { HdfsEntry.find_by_path("/searchquery/result.txt") }
    let(:attachment) { attachments(:attachment) }
    let(:public_workspace) { workspaces(:public_with_no_collaborators) }
    let(:private_workspace) { workspaces(:private) }
    let(:private_workspace_not_a_member) { workspaces(:private_with_no_collaborators) }
    let(:private_workfile_hidden_from_owner) { workfiles(:no_collaborators_private) }
    let(:private_workfile) { workfiles(:private) }
    let(:public_workfile) { workfiles(:public) }
    let(:dataset) { datasets(:searchquery_table) }
    let(:typeahead_dataset) { datasets(:typeahead_gpdb_table) }
    let(:shared_dataset) { datasets(:searchquery_shared_table) }
    let(:chorus_view) { datasets(:searchquery_chorus_view) }

    before do
      reindex_solr_fixtures
    end

    def create_and_record_search(*args)
      if args.empty?
        tape_name = "search_solr_searchquery"
        args = [owner, {:query => 'searchquery'}]
      end
      record_with_vcr(tape_name) do
        search = Search.new(*args)
        yield search
      end
    end

    describe "with an empty search string" do
      it "returns an empty array" do
        create_and_record_search(owner, :query => "") do |search|
          search.models.should be {}
        end
      end
    end

    describe "num_found" do
      it "returns a hash with the number found of each type" do
        create_and_record_search do |search|
          search.num_found[:users].should == 1
          search.num_found[:instances].should == 3
          search.num_found[:datasets].should == 6
        end
      end

      it "returns a hash with the total count for the given type" do
        create_and_record_search(owner, :query => 'searchquery', :entity_type => 'user') do |search|
          search.num_found[:users].should == 1
          search.num_found[:instances].should == 0
        end
      end

      it "includes the number of workspace specific results found" do
        workspace = workspaces(:search_public)
        create_and_record_search(owner, :query => 'searchquery', :workspace_id => workspace.id) do |search|
          search.num_found[:this_workspace].should == 7
        end
      end
    end

    describe "users" do
      it "includes the highlighted attributes" do
        create_and_record_search do |search|
          user = search.users.first
          user.highlighted_attributes[:first_name][0].should == '<em>searchquery</em>'
        end
      end

      it "returns the User objects found" do
        create_and_record_search do |search|
          search.users.length.should == 1
          search.users.first.should == owner
        end
      end
    end

    describe "instances" do
      it "should include Gpdb, Hadoop, and Gnip" do
        create_and_record_search do |search|
          search.instances.should include(gpdb_data_source)
          search.instances.should include(hadoop_instance)
          search.instances.should include(gnip_instance)
        end
      end

      context "including highlighted attributes" do
        [GpdbDataSource, HadoopInstance, GnipInstance].each do |instance_type|
          it "should include highlighted attributes for #{instance_type.name}" do
            create_and_record_search do |search|
              instance = search.instances.select { |instance| instance.is_a?(instance_type) }.first
              instance.highlighted_attributes.length.should > 0
              instance.highlighted_attributes[:description][0].should =~ /<em>searchquery<\/em>/
            end
          end
        end
      end
    end

    describe "datasets" do
      it "includes the highlighted attributes" do
        create_and_record_search do |search|
          dataset = search.datasets.find { |dataset| dataset.name == 'searchquery_table' }
          dataset.highlighted_attributes[:name][0].should == "<em>searchquery</em>_table"
          dataset.highlighted_attributes[:database_name][0].should == "<em>searchquery</em>_database"
          dataset.highlighted_attributes[:schema_name][0].should == "<em>searchquery</em>_schema"
          dataset.highlighted_attributes.should have_key(:table_description)
          dataset.highlighted_attributes.should have_key(:column_description)
          dataset.highlighted_attributes.should have_key(:column_name)
          dataset.highlighted_attributes.length.should == 6
        end
      end

      it "includes the highlighted query for a chorus view" do
        create_and_record_search do |search|
          chorus_view = search.datasets.find { |dataset| dataset.is_a? ChorusView }
          chorus_view.highlighted_attributes[:query][0].should == "select <em>searchquery</em> from a_table"
        end
      end

      it "returns the Dataset objects found" do
        create_and_record_search do |search|
          search.datasets.should =~ [dataset, shared_dataset, chorus_view, typeahead_dataset, datasets(:typeahead_chorus_view), datasets(:searchquery_chorus_view_private)]
        end
      end

      it "excludes datasets you don't have permissions to" do
        user = users(:no_collaborators)
        user.instance_accounts.joins(:gpdb_databases).should be_empty
        create_and_record_search(user, :query => 'searchquery', :entity_type => :dataset) do |search|
          search.datasets.should == [shared_dataset]
        end
      end

      it "includes notes" do
        events(:note_on_dataset).body.should == "notesearch ftw"
        create_and_record_search(owner, :query => 'notesearch') do |search|
          dataset = search.datasets.first
          dataset.search_result_notes[0][:highlighted_attributes][:body][0].should == "<em>notesearch</em> ftw"
        end
      end

      it "removes tags from the note body" do
        create_and_record_search(owner, :query => 'searchwithhtml') do |search|
          note = events(:note_on_dataset)
          note.update_attribute(:body, 'sometext <b>searchwithhtml</b> ftw')
          Sunspot.commit
          dataset = search.datasets.first
          dataset.search_result_notes[0][:highlighted_attributes][:body][0].should match %r{sometext\s+<em>searchwithhtml</em>\s+ftw}
        end
      end

      context "when the search results include note that has been deleted (i.e. the search index is stale)" do
        it "doesn't raise an error" do
          note = events(:note_on_dataset)
          note.body.should == "notesearch ftw"
          create_and_record_search(owner, :query => 'notesearch') do |search|
            expect {
              note.delete
              search.datasets
            }.to_not raise_error
          end
        end
      end

      it "includes insights" do
        events(:insight_on_dataset).body.should == "insightsearch ftw"
        create_and_record_search(owner, :query => 'insightsearch') do |search|
          dataset = search.datasets.first
          dataset.search_result_notes[0][:highlighted_attributes][:body][0].should == "<em>insightsearch</em> ftw"
          dataset.search_result_notes[0][:is_insight].should be_true
        end
      end

      it "includes comments on notes" do
        comment = comments(:comment_on_note_on_dataset)
        comment.body.should == "commentsearch ftw"
        create_and_record_search(owner, :query => 'commentsearch') do |search|
          dataset = search.datasets.find { |dataset| comment.event.target1 == dataset }
          dataset.search_result_notes[0][:highlighted_attributes][:body][0].should == "<em>commentsearch</em> ftw"
          dataset.search_result_notes[0][:is_comment].should be_true
        end
      end

      it "removes tags from the comment body" do
        create_and_record_search(owner, :query => 'searchwithhtml') do |search|
          comment = comments(:comment_on_note_on_dataset)
          comment.update_attribute(:body, 'sometext <b>searchwithhtml</b> ftw')
          Sunspot.commit
          dataset = search.datasets.first
          dataset.search_result_notes[0][:highlighted_attributes][:body][0].should match %r{sometext\s+<em>searchwithhtml</em>\s+ftw}
        end
      end

      it "excludes notes on datasets the user can't see" do
        events(:note_on_dataset).body.should == "notesearch ftw"
        create_and_record_search(the_collaborator, :query => 'notesearch') do |search|
          search.datasets.should be_empty
        end
      end

      it "includes notes created in the workspace context" do
        events(:note_on_workspace_dataset).body.should == "workspacedatasetnotesearch"
        create_and_record_search(owner, :query => 'workspacedatasetnotesearch') do |search|
          dataset = search.datasets.first
          dataset.search_result_notes[0][:highlighted_attributes][:body][0].should == "<em>workspacedatasetnotesearch</em>"
        end
      end
    end

    describe "chorus_views" do
      let(:chorus_view) { datasets(:searchquery_chorus_view_private) }

      context "when the user has access to the workspace" do
        let(:user) { owner }

        it "is included in search results" do
          create_and_record_search(user, :query => 'searchquery', :entity_type => 'Dataset') do |search|
            search.datasets.should include(chorus_view)
          end
        end

        it "includes chorus views associated with matching notes" do
          create_and_record_search(user, :query => 'workspacedatasetnotesearch', :entity_type => 'Dataset') do |search|
            search.datasets.should include(chorus_view)
          end
        end

        it "includes chorus views associated with matching notes" do
          create_and_record_search(user, :query => 'commentsearch', :entity_type => 'Dataset') do |search|
            search.datasets.should include(chorus_view)
          end
        end
      end

      context "when the user does not have access to the workspace" do
        let(:user) { users(:not_a_member) }

        it "is excluded from search results" do
          create_and_record_search(user, :query => 'searchquery', :entity_type => 'Dataset') do |search|
            instance_account = FactoryGirl.build(:instance_account, :instance => chorus_view.data_source, :owner => user).tap { |a| a.save(:validate => false)}
            chorus_view.schema.database.instance_accounts << instance_account
            chorus_view.solr_index!
            search.datasets.should_not include(chorus_view)
          end
        end

        it "excludes results with matching notes on the chorus view" do
          create_and_record_search(user, :query => 'workspacedatasetnotesearch', :entity_type => 'Dataset') do |search|
            instance_account = FactoryGirl.build(:instance_account, :instance => chorus_view.data_source, :owner => user).tap { |a| a.save(:validate => false)}
            chorus_view.schema.database.instance_accounts << instance_account
            chorus_view.solr_index!
            search.datasets.should_not include(chorus_view)
          end
        end

        it "excludes results with matching comments on the chorus view" do
          create_and_record_search(user, :query => 'commentsearch', :entity_type => 'Dataset') do |search|
            instance_account = FactoryGirl.build(:instance_account, :instance => chorus_view.data_source, :owner => user).tap { |a| a.save(:validate => false)}
            chorus_view.schema.database.instance_accounts << instance_account
            chorus_view.solr_index!
            search.datasets.should_not include(chorus_view)
          end
        end
      end
    end

    describe "hdfs_entries" do
      it "includes the highlighted attributes" do
        create_and_record_search do |search|
          hdfs = search.hdfs_entries.first
          hdfs.highlighted_attributes.length.should == 2
          hdfs.highlighted_attributes[:parent_name][0].should == "<em>searchquery</em>"
          hdfs.highlighted_attributes[:path][0].should == "/<em>searchquery</em>"
        end
      end

      it "returns the HadoopInstance objects found" do
        create_and_record_search do |search|
          search.hdfs_entries.length.should == 1
          search.hdfs_entries.first.should == hdfs_entry
        end
      end
    end

    describe "attachments" do
      it "includes the highlighted attributes" do
        create_and_record_search do |search|
          attachment = search.attachments.first
          attachment.highlighted_attributes.length.should == 1
          attachment.highlighted_attributes[:name][0].should =~ /\<em\>searchquery\<\/em\>/
        end
      end

      it "returns the Attachment objects found" do
        create_and_record_search do |search|
          search.attachments.first.should be_an Attachment
        end
      end

      let(:private_workfile_attachment) { attachments(:attachment_private_workfile) }
      let(:private_workspace_attachment) { attachments(:attachment_private_workspace) }
      let(:dataset_attachment) { attachments(:attachment_dataset) }

      context "when the attachment belongs on workspace and workfile" do
        let(:user_with_access) { users(:no_collaborators) }
        let(:user_without_access) { owner }

        it "excludes them where the user does not have access" do
          create_and_record_search(user_without_access, :query => 'searchquery', :entity_type => :attachment) do |search|
            search.attachments.should_not include(private_workspace_attachment)
            search.attachments.should_not include(private_workfile_attachment)
          end
        end

        it "includes them for users with access" do
          create_and_record_search(user_with_access, :query => 'searchquery', :entity_type => :attachment) do |search|
            search.attachments.should include(private_workspace_attachment)
            search.attachments.should include(private_workfile_attachment)
          end
        end
      end

      context "when the attachment belongs on datasets" do
        let(:user_with_access) { owner }
        let(:user_without_access) { users(:no_collaborators) }

        it "excludes them where the user does not have access" do
          create_and_record_search(user_without_access, :query => 'searchquery', :entity_type => :attachment) do |search|
            search.attachments.should_not include(dataset_attachment)
          end
        end

        it "includes them for users with access" do
          create_and_record_search(user_with_access, :query => 'searchquery', :entity_type => :attachment) do |search|
            search.attachments.should include(dataset_attachment)
          end
        end
      end

      context "when the attachment belongs on a chorus view" do
        let(:chorus_view) { datasets(:searchquery_chorus_view_private) }
        let(:attachment) { attachments(:attachment_on_chorus_view) }

        context "when the user has access to the workspace" do
          let(:user) { owner }

          it "includes attachments where the chorus_view is accessible" do
            create_and_record_search(user, :query => 'attachmentsearch', :entity_type => 'Attachment') do |search|
              search.attachments.should include(attachment)
            end
          end
        end

        context "when the user does not have access to the workspace" do
          let(:user) { users(:not_a_member) }

          it "excludes attachments when the chorus view is not accessible" do
            create_and_record_search(user, :query => 'attachmentsearch', :entity_type => 'Attachment') do |search|
              instance_account = FactoryGirl.build(:instance_account, :instance => chorus_view.data_source, :owner => user).tap { |a| a.save(:validate => false)}
              chorus_view.schema.database.instance_accounts << instance_account
              chorus_view.solr_index!
              search.attachments.should_not include(attachment)
            end
          end
        end
      end
    end

    describe "highlighted notes" do
      it "includes highlighted notes in the highlighted_attributes" do
        create_and_record_search(owner, :query => 'greenplumsearch') do |search|
          search.instances.length.should == 2
          gpdb_data_source_with_notes = search.instances[1]
          gpdb_data_source_with_notes.search_result_notes.length.should == 2
          gpdb_data_source_with_notes.search_result_notes[0][:highlighted_attributes][:body][0].should == "no, not <em>greenplumsearch</em>"
        end
      end
    end

    describe "per_type=" do
      it "limits the search to not return more than some number of models" do
        create_and_record_search(owner, :query => 'alphasearch', :per_type => 1) do |search|
          search.users.length.should == 1
          search.num_found[:users].should > 1
        end
      end
    end

    describe "tag search" do
      let(:tag) { ActsAsTaggableOn::Tag.named("alpha").first }

      it "returns models with the specified tag" do
        create_and_record_search(owner, :query => tag.name, :tag => true, :per_type => 1) do |search|
          search.models[:workfiles].first.tags.should include tag
          search.models[:datasets].first.tags.should include tag
          search.models[:workspaces].first.tags.should include tag
        end
      end

      it "returns workfiles sorted by file_name" do
        query_params = { :query => "test_file_name_sort", :tag => true }
        record_with_vcr do
          FactoryGirl.create :workfile, :file_name => "test_sort1.sql", :tag_list => "test_file_name_sort"
          FactoryGirl.create :workfile, :file_name => "test_sort2.sql", :tag_list => "test_file_name_sort"
          Workfile.solr_reindex
          search = Search.new(owner, query_params)
          search.workfiles.should be_sorted_by :file_name

          # changing the file names changes the order
          search.workfiles.second.update_attributes(:file_name => "aaa_" + search.workfiles.second.file_name)
          Workfile.solr_reindex

          search = Search.new(owner, query_params)
          search.workfiles.should be_sorted_by :file_name
        end
      end
    end

    context "when a record exists in solr, but not in the database" do
      before do
        public_workspace.delete
      end

      it "does not blow up" do
        create_and_record_search do |search|
          search.models
        end
      end
    end

    context "when searching workspace as the owner" do
      it "returns public and member workspaces but not others' private workspaces" do
        create_and_record_search do |search|
          search.workspaces.should include(public_workspace)
          search.workspaces.should include(private_workspace)
          search.workspaces.should_not include(private_workspace_not_a_member)
        end
      end

      it "includes notes" do
        events(:note_on_public_workspace).body.should == "notesearch forever"
        create_and_record_search(owner, :query => 'notesearch') do |search|
          workspace = search.workspaces.first
          workspace.search_result_notes[0][:highlighted_attributes][:body][0].should == "<em>notesearch</em> forever"
        end
      end

      it "excludes notes on others' private workspaces" do
        events(:note_on_no_collaborators_private).body.should == "notesearch never"
        create_and_record_search(owner, :query => 'notesearch') do |search|
          search.workspaces.should_not include private_workspace_not_a_member
        end
      end
    end

    context "when searching workspaces as the admin" do
      it "returns all workspaces" do
        create_and_record_search(admin, :query => 'searchquery', :entity_type => :workspace) do |search|
          search.workspaces.should include(public_workspace)
          search.workspaces.should include(private_workspace)
          search.workspaces.should include(private_workspace_not_a_member)
        end
      end
    end
  end
end

describe "SearchExtensions" do
  describe "security_type_name" do
    it "returns an array including the type_name of all ancestors" do
      ChorusView.security_type_name.should =~ [ChorusView.type_name, GpdbDataset.type_name, Dataset.type_name]
    end

    it "instances behave the same way" do
      ChorusView.first.security_type_name.should =~ ChorusView.security_type_name
    end
  end
end
