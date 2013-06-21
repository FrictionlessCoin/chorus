describe("chorus.views.WorkspaceQuickstart", function() {
    beforeEach(function() {
        this.model = backboneFixtures.workspace({id: "999", hasAddedSandbox: false, hasAddedWorkfile: false});
        this.model.loaded = true;
        spyOn(chorus.router, "navigate");
        this.view = new chorus.views.WorkspaceQuickstart({model: this.model});
        this.view.render();
    });

    it("has the right headline text", function() {
        expect(this.view.$("h2")).toContainTranslation("workspace.quickstart.headline");
    });

    it("has the right body text", function() {
        expect(this.view.$(".body")).toContainTranslation("workspace.quickstart.body");
    });

    context("when the quickstart guide is shown", function() {
        context("the tasks haven't been done", function() {
            beforeEach(function() {
                this.model.set({
                    hasAddedMember: false,
                    hasAddedWorkfile: false,
                    hasAddedSandbox: false,
                    hasChangedSettings: false
                });
                this.view = new chorus.views.WorkspaceQuickstart({model: this.model});
            });

            it("shows the correct boxes", function() {
                this.view.render();
                expect(this.view.$(".add_team_members")).toExist();
                expect(this.view.$(".edit_workspace_settings")).toExist();
                expect(this.view.$(".add_sandbox")).toExist();
                expect(this.view.$(".add_workfiles")).toExist();
            });
        });

        context("the tasks have mostly been done", function() {
            beforeEach(function() {
                this.model.set({
                    hasAddedMember: false,
                    hasAddedWorkfile: true,
                    hasAddedSandbox: true,
                    hasChangedSettings: true
                });
                this.view = new chorus.views.WorkspaceQuickstart({model: this.model});
            });

            it("hides the correct boxes", function() {
                this.view.render();
                expect(this.view.$(".add_team_members")).toExist();
                expect(this.view.$(".edit_workspace_settings")).not.toExist();
                expect(this.view.$(".add_sandbox")).not.toExist();
                expect(this.view.$(".add_workfiles")).not.toExist();
            });

            context("when finishing the last item", function() {
                beforeEach(function() {
                    this.model.set({
                        hasAddedMember: true,
                        hasAddedWorkfile: true,
                        hasAddedSandbox: true,
                        hasChangedSettings: true
                    });

                    this.view = new chorus.views.WorkspaceQuickstart({model: this.model});
                });

                it("redirects to the regular workspace page", function() {
                    this.view.render();
                    expect(chorus.router.navigate).toHaveBeenCalledWith(this.model.showUrl());
                });
            });
        });
    });

    describe("the 'Add Team Members' section", function() {
        it("has a link", function() {
            expect(this.view.$(".add_team_members a")).toContainTranslation("workspace.quickstart.add_team_members.link");
        });

        it("has an image", function() {
            expect(this.view.$(".add_team_members img")).toHaveAttr("src", "images/workspaces/user_quick_start.png");
        });

        it("has a description", function() {
            expect(this.view.$(".add_team_members .text")).toContainTranslation("workspace.quickstart.add_team_members.text");
        });

        it("launches the right dialog", function() {
            expect(this.view.$(".add_team_members a")).toHaveClass("dialog");
            expect(this.view.$(".add_team_members a").data("dialog")).toBe("WorkspaceEditMembers");
        });

        it("hides the box when hasAddedMember is true", function() {
            this.view.model.set({"hasAddedMember": true});
            expect(this.view.$(".add_team_members")).not.toExist();
        });
    });

    describe("the 'Add a Sandbox' section", function() {
        var link;

        beforeEach(function() {
            link = this.view.$(".add_sandbox a");
        });

        it("has a link", function() {
            expect(this.view.$(".add_sandbox a")).toContainTranslation("workspace.quickstart.add_sandbox.link");
        });

        it("has an image", function() {
            expect(this.view.$(".add_sandbox img")).toHaveAttr("src", "images/workspaces/sandbox_quick_start.png");
        });

        it("has a description", function() {
            expect(this.view.$(".add_sandbox .text")).toContainTranslation("workspace.quickstart.add_sandbox.text");
        });

        it("launches the right dialog", function() {
            expect(link).toHaveClass("dialog");
            expect(link).toHaveData("dialog", "SandboxNew");
            expect(link).toHaveData("workspaceId", 999);
        });

        it("makes the sandbox dialog *not* reload the page on completion", function() {
            expect(link).toHaveData("noReload", true);
        });

        it("hides the box when hasAddedSandbox is true", function() {
            this.view.model.set({"hasAddedSandbox": true});
            expect(this.view.$(".add_sandbox")).not.toExist();
        });
    });

    describe("the 'Add Work Files' section", function() {
        var link;

        beforeEach(function() {
            link = this.view.$(".add_workfiles a");
        });

        it("has a link", function() {
            expect(link).toContainTranslation("workspace.quickstart.add_workfiles.link");
        });

        it("has an image", function() {
            expect(this.view.$(".add_workfiles img")).toHaveAttr("src", "images/workspaces/work_files_quick_start.png");
        });

        it("has a description", function() {
            expect(this.view.$(".add_workfiles .text")).toContainTranslation("workspace.quickstart.add_workfiles.text");
        });

        it("launches the right dialog", function() {
            expect(link).toHaveClass("dialog");
            expect(link).toHaveData("dialog", "WorkfilesImport");
            expect(link).toHaveData("workspaceId", 999);
        });

        it("hides the box when hasAddedWorkfile is true", function() {
            this.view.model.set({"hasAddedWorkfile": true});
            expect(this.view.$(".add_workfiles")).not.toExist();
        });
    });

    describe("the 'Edit Workspace Settings' section", function() {
        var link;
        beforeEach(function() {
            link = this.view.$(".edit_workspace_settings a");
        });

        it("has a link", function() {
            expect(link).toContainTranslation("workspace.quickstart.edit_workspace_settings.link");
        });

        it("has an image", function() {
            expect(this.view.$(".edit_workspace_settings img")).toHaveAttr("src", "images/workspaces/config_quick_start.png");
        });

        it("has a description", function() {
            expect(this.view.$(".edit_workspace_settings .text")).toContainTranslation("workspace.quickstart.edit_workspace_settings.text");
        });

        it("launches the right dialog", function() {
            expect(this.view.$(link)).toHaveClass("dialog");
            expect(this.view.$(link).data("dialog")).toBe("EditWorkspace");
        });
    });

    describe("when the workspace is edited", function() {
        beforeEach(function() {
            this.view.model.set({"hasChangedSettings": true});
        });

        it("hides the edit workspace box", function() {
            expect(this.view.$(".edit_workspace_settings")).not.toExist();
        });

        describe("when the page re-renders", function() {
            it("does not have the box if hadChangedSetting is true", function() {
                this.view.render();
                expect(this.view.$(".edit_workspace_settings")).not.toExist();
            });
        });
    });

    describe("when dialogs are dismissed", function() {
        context("and there are still unhidden info boxes", function() {
            beforeEach(function() {
                this.view.$(".info_box.edit_workspace_settings").addClass("hidden");
                chorus.PageEvents.trigger("modal:closed");
            });

            it("does not navigate", function() {
                expect(chorus.router.navigate).not.toHaveBeenCalled();
            });
        });

        context("and all info boxes are hidden", function() {
            beforeEach(function() {
                this.view.$(".info_box").addClass("hidden");
                chorus.PageEvents.trigger("modal:closed");

                this.model.set({
                    hasAddedMember: true,
                    hasAddedWorkfile: true,
                    hasAddedSandbox: true,
                    hasChangedSettings: true
                });

                this.view = new chorus.views.WorkspaceQuickstart({model: this.model});
            });

            it("navigates to the normal workspace show page", function() {
                this.view.render();
                expect(chorus.router.navigate).toHaveBeenCalledWith(this.view.model.showUrl());
            });
        });
    });

    describe("clicking the dismiss link", function() {
        beforeEach(function() {
            chorus.router.navigate.reset();
            this.view.$("a.dismiss").click();
        });

        it("navigates to the normal workspace show page", function() {
            expect(chorus.router.navigate).toHaveBeenCalledWith("#/workspaces/999");
        });
    });
});