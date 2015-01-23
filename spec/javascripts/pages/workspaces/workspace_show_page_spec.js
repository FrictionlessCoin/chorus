describe("chorus.pages.WorkspaceShowPage", function() {
    describe("#initialize", function() {
        beforeEach(function() {
            this.page = new chorus.pages.WorkspaceShowPage('4');
        });

        it("sets up the model properly", function() {
            expect(this.page.model.get("id")).toBe('4');
        });

        it("fetches the model", function() {
            expect(_.any(this.server.requests, function(req) { return req.url.trim() === "/workspaces/4"; })).toBeTruthy();
        });

        it("has a helpId", function() {
            expect(this.page.helpId).toBe("workspace_summary");
        });

        it("sets the workspaceId, for prioritizing search", function() {
            expect(this.page.workspaceId).toBe(4);
        });

        describe("when we are in quickstart mode", function() {
            context("as the workspace owner", function(){
                beforeEach(function() {
                    this.model = backboneFixtures.workspace({
                        owner: { id: "4" },
                        hasAddedMember: false,
                        hasAddedWorkfile: false,
                        hasAddedSandbox: false,
                        hasChangedSettings: false
                    });
                    spyOn(chorus.router, "navigate");

                    this.page = new chorus.pages.WorkspaceShowPage('4');
                    this.page.model._owner = { id: 4 };
                    setLoggedInUser({id: "4"}, this.chorus);
                });

                describe("the fetch completes", function() {
                    beforeEach(function() {
                        this.server.completeFetchFor(this.page.model, this.model);
                    });

                    it("navigates to the quickstart page", function() {
                        expect(chorus.router.navigate).toHaveBeenCalledWith("/workspaces/4/quickstart");
                    });
                });
            });

            context("as somebody else", function() {
                beforeEach(function() {
                    this.page.model.set({
                        hasAddedMember: false,
                        hasAddedWorkfile: false,
                        hasAddedSandbox: false,
                        hasChangedSettings: false
                    });
                    spyOn(chorus.router, "navigate");
                    this.page = new chorus.pages.WorkspaceShowPage('4');
                    this.page.model._owner = { id: 9877 };
                    setLoggedInUser({id: "4"}, this.chorus);
                });

                it("does not navigate to the quickstart page", function() {
                    expect(chorus.router.navigate).not.toHaveBeenCalled();
                });
            });
        });

        describe("when we are not in quickstart mode", function() {
            beforeEach(function() {
                this.model = backboneFixtures.workspace({
                    owner: { id: "4" },
                    hasAddedMember: true,
                    hasAddedWorkfile: true,
                    hasAddedSandbox: true,
                    hasChangedSettings: true
                });
                spyOn(chorus.router, "navigate");
                this.page = new chorus.pages.WorkspaceShowPage('4');
                this.page.model._owner = { id: 4 };
                setLoggedInUser({id: "4"}, this.chorus);
            });

            describe("the fetch completes", function() {
                beforeEach(function() {
                    this.server.completeFetchFor(this.page.model, this.model);
                });

                it("navigates to the quickstart page", function() {
                    expect(chorus.router.navigate).not.toHaveBeenCalled();
                });
            });
        });
    });

    describe("#render", function() {
        beforeEach(function() {
            this.page = new chorus.pages.WorkspaceShowPage(4);
        });

        context("when the model fails to load properly", function() {
            beforeEach(function() {
                spyOn(Backbone.history, "loadUrl");
                this.page.model.trigger('resourceNotFound');
            });

            it("navigates to the 404 page", function() {
                expect(Backbone.history.loadUrl).toHaveBeenCalledWith("/invalidRoute");
            });
        });

        context("when the model has loaded", function() {
            beforeEach(function() {
                chorus.models.Config.instance().set({ kaggleConfigured: false });
                spyOn(this.page.model, "workspaceAdmin").andReturn(false);
                this.workspaceName = "Cool Workspace";
                var workspace = backboneFixtures.workspace({id: 4, summary: "this is a summary", name: this.workspaceName});
                this.server.completeFetchFor(this.page.model, workspace);
                this.server.completeFetchFor(this.page.model.activities(), [backboneFixtures.activity.noteOnWorkfileCreated(), backboneFixtures.activity.insightOnGreenplumDataSource()]);
                this.page.render();
            });

            it("has a titlebar", function() {
                expect(this.page.$(".page_sub_header")).toContainText(this.workspaceName);
            });

            itBehavesLike.aPageWithPrimaryActions([
                {name: 'workspace_settings', target: chorus.dialogs.EditWorkspace},
                {name: 'add_insight', target: chorus.dialogs.InsightsNew},
                {name: 'add_note', target: chorus.dialogs.NotesNew},
            ]);

            describe("when the workspace does not have a sandbox", function () {
                beforeEach(function () {
                    spyOn(this.page.model, "sandbox").andReturn(undefined);
                    this.page.render();
                });

                itBehavesLike.aPageWithPrimaryActions([
                    {name: 'workspace_settings', target: chorus.dialogs.EditWorkspace},
                    {name: 'add_insight', target: chorus.dialogs.InsightsNew},
                    {name: 'add_note', target: chorus.dialogs.NotesNew},
                    {name: 'create_a_sandbox', target: chorus.dialogs.SandboxNew}
                ]);

                context("but the workspace is archived", function () {
                    beforeEach(function () {
                        this.page.model.set({archivedAt: "2012-05-08 21:40:14"});
                        this.page.render();
                    });

                    itBehavesLike.aPageWithPrimaryActions([
                        {name: 'workspace_settings', target: chorus.dialogs.EditWorkspace}
                    ]);
                });
            });

            describe("when the current user has workspace admin permissions on the workspace", function () {
                beforeEach(function () {
                    this.page.model.workspaceAdmin.andReturn(true);
                    this.page.render();
                });

                itBehavesLike.aPageWithPrimaryActions([
                    {name: 'workspace_settings', target: chorus.dialogs.EditWorkspace},
                    {name: 'add_insight', target: chorus.dialogs.InsightsNew},
                    {name: 'add_note', target: chorus.dialogs.NotesNew},
                    {name: 'edit_workspace_members', target: chorus.dialogs.WorkspaceEditMembers},
                    {name: 'delete_workspace', target: chorus.alerts.WorkspaceDelete}
                ]);

                context("but the workspace is archived", function () {
                    beforeEach(function () {
                        this.page.model.set({archivedAt: "2012-05-08 21:40:14"});
                        this.page.render();
                    });

                    itBehavesLike.aPageWithPrimaryActions([
                        {name: 'workspace_settings', target: chorus.dialogs.EditWorkspace},
                        {name: 'delete_workspace', target: chorus.alerts.WorkspaceDelete}
                    ]);
                });
            });

            describe("when Kaggle is enabled", function () {
                beforeEach(function () {
                    chorus.models.Config.instance().set({ kaggleConfigured: true });
                    this.page.render();
                });

                itBehavesLike.aPageWithPrimaryActions([
                    {name: 'workspace_settings', target: chorus.dialogs.EditWorkspace},
                    {name: 'add_insight', target: chorus.dialogs.InsightsNew},
                    {name: 'add_note', target: chorus.dialogs.NotesNew},
                    {name: 'find_kaggle_contributors', target: '#/workspaces/4/kaggle'}
                ]);
            });

            it("displays all activities by default", function() {
                expect(this.page.mainContent.content.$("ul.activities li.activity").length).toBe(2);
            });

            describe("clicking the insight/activity links", function() {
                beforeEach(function() {
                    this.server.reset();
                    this.page.mainContent.contentHeader.$(".activities_filter").val("only_insights").change();
                });

                it("fetches the insights", function() {
                    expect(this.page.model.activities()).toHaveBeenFetched();
                });
            });

            it("uses the workspace's summary for the text of the header", function() {
                expect(this.page.mainContent.contentHeader.$(".original").text()).toBe(this.page.model.get("summary"));
            });

            context("when the workspace settings dialog modifies the workspace", function() {
                beforeEach(function() {
                    this.page.model.set({name: "bar", "public": false});
                    this.page.model.trigger("saved");
                });

                it("updates the title", function() {
                    expect(this.page.$(".content_header .title")).toContainText("bar");
                });

                it("changes the icon", function() {
                    expect(this.page.$(".activity_list_header .title img").attr("src")).toBe("/images/workspaces/workspace_private_large.png");
                });
            });
        });
    });
});
