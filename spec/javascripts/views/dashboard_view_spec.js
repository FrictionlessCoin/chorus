// oct 2014
// NO LONGER IN USE
// applies to an older version of chorus

describe("chorus.views.Dashboard", function(){
    beforeEach(function(){
        chorus.session = backboneFixtures.session();
        this.workspaceSet = backboneFixtures.workspaceSet();
        var dataSourceSet = new chorus.collections.DataSourceSet();
        this.view = new chorus.views.Dashboard({ collection: this.workspaceSet, dataSourceSet: dataSourceSet });
        this.activities = new chorus.collections.ActivitySet([]);
    });

    describe("#setup", function() {
        it("fetches the dashboard activities", function() {
            expect(this.activities).toHaveBeenFetched();
        });

        it("doesnt re-fetch the activity list if a comment is added", function() {
            this.server.reset();
            chorus.PageEvents.trigger("comment:added", backboneFixtures.comment());
            expect(this.activities).not.toHaveBeenFetched();
        });

        it("doesnt re-fetch the activity list if a comment is deleted", function() {
            this.server.reset();
            chorus.PageEvents.trigger("comment:deleted", backboneFixtures.comment());
            expect(this.activities).not.toHaveBeenFetched();
        });

        context("with some member and some public workspaces", function () {
            beforeEach(function () {
                this.workspaceSet = backboneFixtures.workspaceSet();
                var dataSourceSet = new chorus.collections.DataSourceSet();
                this.view = new chorus.views.Dashboard({ collection: this.workspaceSet, dataSourceSet: dataSourceSet });
            });

            it("creates a collection of workspaces the current user is a member of", function () {
                expect(this.view.memberWorkspaces.attributes.userId).toBe(chorus.session.user().id);
                var memberWorkspaceIds = _.map(this.view.collection.where({isMember: true}), function (model) {
                    return model.get('id');
                });
                expect(this.view.memberWorkspaces.pluck('id')).toEqual(memberWorkspaceIds);
            });
        });

        context("with some project and some not-project workspaces", function () {
            beforeEach(function () {
                this.workspaceSet = backboneFixtures.workspaceSet();
                this.workspaceSet.each(function (model) {
                    model.set('isProject', false);
                });
                this.workspaceSet.at(0).set('isProject', true);
                this.workspaceSet.at(2).set('isProject', true);
                var dataSourceSet = new chorus.collections.DataSourceSet();
                this.view = new chorus.views.Dashboard({ collection: this.workspaceSet, dataSourceSet: dataSourceSet });
            });

            it("creates a collection of workspaces the current user is a member of", function () {
                expect(this.view.projectList.collection.pluck('id')).toEqual([this.workspaceSet.at(0).get('id'), this.workspaceSet.at(2).get('id')]);
            });
        });

        context("if the workspace collection finishes fetching after the view has loaded", function () {
            it("pushes updates down to the derived collections", function () {
                spyOn(this.view.memberWorkspaces, 'reset');
                spyOn(this.view.projectWorkspaces, 'reset');
                this.workspaceSet.trigger('loaded');
                expect(this.view.memberWorkspaces.reset).toHaveBeenCalled();
                expect(this.view.projectWorkspaces.reset).toHaveBeenCalled();
            });
        });
    });

    describe("#render", function() {
        beforeEach(function () {
            this.view.render();
        });

        describe("the header", function() {
            beforeEach(function() {
                this.headerView = this.view.dashboardMain.contentHeader;
            });

            it("is an ActivityListHeader view", function() {
                expect(this.headerView).toBeA(chorus.views.ActivityListHeader);
            });

            it("has the right titles for both 'all' and 'insights' modes", function() {
                expect(this.headerView.options.allTitle).toMatchTranslation("dashboard.title.activity");
                expect(this.headerView.options.insightsTitle).toMatchTranslation("dashboard.title.insights");
            });
        });

        describe("the workspace list", function(){
            it("renders the workspace list with the right title", function() {
                expect(this.view.$(".main_content.workspace_list .content_header h1").text()).toMatchTranslation("header.workspaces");
            });

            it("has a create workspace link in the content details", function() {
                expect(this.view.$(".workspace_list .content_details [data-dialog=WorkspaceNew]")).toExist();
            });

            it("has a 'browse all' link in the content details", function() {
                var browseAllLink = this.view.$(".main_content.workspace_list .content_details a[href='#/workspaces']");
                expect(browseAllLink).toExist();
                expect(browseAllLink.text()).toMatchTranslation("dashboard.workspaces.browse_all");
            });
        });

        describe("the project list", function() {
            it("renders the project list with the right title", function() {
                expect(this.view.$(".project_list_header .title").text()).toMatchTranslation("dashboard.project_card_list.name");
            });

            it("has a ProjectListHeader view", function () {
                expect(this.view.projectList.contentHeader).toBeA(chorus.views.ProjectListHeader);
            });
        });

        describe('the data source list', function() {
            it('renders the data source list with the right title', function() {
                expect(this.view.$(".main_content.data_source_list .content_header h1").text()).toMatchTranslation("header.browse_data");
            });

            it("has a 'browse all' link in the content details", function() {
                var browseLink = this.view.$(".dashboard_data_source_list_content_details a.browse_all");
                expect(browseLink.text().trim()).toMatchTranslation("dashboard.data_sources.browse_all");
                expect(browseLink.attr("href")).toBe("#/data_sources");
            });

            it('has the Add a Data Source link', function() {
                var link = this.view.$(".dashboard_data_source_list_content_details a.add");
                expect(link.text().trim()).toMatchTranslation("dashboard.data_sources.add");
                expect(link.data("dialog")).toBe("DataSourcesNew");
            });
        });

        it("has an activity list", function() {
            expect(this.view.$(".activity_list")).toExist();
        });
    });
});
