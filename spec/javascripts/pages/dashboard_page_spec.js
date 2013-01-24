describe("chorus.pages.DashboardPage", function() {
    beforeEach(function() {
        chorus.session = new chorus.models.Session({ id: "foo" });
        this.page = new chorus.pages.DashboardPage();
    });

    it("has a helpId", function() {
        expect(this.page.helpId).toBe("dashboard");
    });

    it("fetches all the collections", function() {
        spyOn(chorus.collections.UserSet.prototype, "fetchAll").andCallThrough();
        spyOn(chorus.collections.DataSourceSet.prototype, "fetchAll").andCallThrough();
        spyOn(chorus.collections.HadoopInstanceSet.prototype, "fetchAll").andCallThrough();
        spyOn(chorus.collections.GnipInstanceSet.prototype, "fetchAll").andCallThrough();
        spyOn(chorus.collections.WorkspaceSet.prototype, "fetchAll").andCallThrough();
        var page = new chorus.pages.DashboardPage();
        expect(page.userSet.fetchAll).toHaveBeenCalled();
        expect(page.dataSourceSet.fetchAll).toHaveBeenCalled();
        expect(page.hadoopInstanceSet.fetchAll).toHaveBeenCalled();
        expect(page.gnipInstanceSet.fetchAll).toHaveBeenCalled();
        expect(page.workspaceSet.fetchAll).toHaveBeenCalled();
    });

    describe("#render", function() {
        beforeEach(function() {
            this.server.completeFetchAllFor(this.page.dataSourceSet, [
                                         rspecFixtures.gpdbDataSource(),
                                         rspecFixtures.oracleInstance()
            ]);
            this.server.completeFetchAllFor(this.page.hadoopInstanceSet, [
                                         rspecFixtures.hadoopInstance(),
                                         rspecFixtures.hadoopInstance()
            ]);
            this.server.completeFetchAllFor(this.page.gnipInstanceSet, [
                                         rspecFixtures.gnipInstance(),
                                         rspecFixtures.gnipInstance()
            ]);

            this.page.render();
        });

        it("creates a Header view", function() {
            expect(this.page.$("#header.header")).toExist();
        });

        context("the workspace list", function() {
            beforeEach(function() {
                this.workspaceList = this.page.mainContent.workspaceList;
            });

            it("has a title", function() {
                expect(this.workspaceList.$("h1").text()).toBe("My Workspaces");
            });

            it("creates a WorkspaceList view", function() {
                expect(this.page.$(".dashboard_workspace_list")).toExist();
            });
        });

        it("does not have a sidebar", function() {
            expect(this.page.$("#sidebar_wrapper")).not.toExist();
        });

        context("when the users fetch completes", function() {
            beforeEach(function() {
                this.server.completeFetchAllFor(
                    this.page.userSet,
                    rspecFixtures.userSet()
                );
            });

            it("shows the number of users", function() {
                expect(this.page.$("#user_count a")).toContainTranslation("dashboard.user_count", {count: rspecFixtures.userSet().length});
                expect(this.page.$("#user_count")).not.toHaveClass("hidden");
            });
        });
    });

    context("#setup", function() {
        beforeEach(function() {
            this.server.completeFetchAllFor(this.page.dataSourceSet, [
                rspecFixtures.gpdbDataSource(),
                rspecFixtures.oracleInstance()
            ]);

            this.server.completeFetchAllFor(this.page.hadoopInstanceSet, [
                rspecFixtures.hadoopInstance(),
                rspecFixtures.hadoopInstance()
            ]);

            this.server.completeFetchAllFor(this.page.gnipInstanceSet, [
                rspecFixtures.gnipInstance(),
                rspecFixtures.gnipInstance()
            ]);
            this.server.completeFetchAllFor(this.page.gnipInstanceSet, [
                rspecFixtures.gnipInstance(),
                rspecFixtures.gnipInstance()
            ]);
        });

        it("sets chorus.session.user as the model", function() {
            expect(this.page.model).toBe(chorus.session.user());
        });

        it("gets the number of users", function() {
            expect(this.server.lastFetchFor(new chorus.collections.UserSet([], {page:1, per_page:1}))).toBeTruthy();
        });

        it("passes the collection through to the workspaceSet view", function() {
            expect(this.page.mainContent.workspaceList.collection).toBe(this.page.workspaceSet);
        });

        it("fetches active workspaces for the current user, including recent comments", function() {
            expect(this.page.workspaceSet.attributes.showLatestComments).toBeTruthy();
        });

        it("should sort the workspaceSet by name ascending", function() {
            expect(this.page.workspaceSet.order).toBe("name");
        });

        it("passes the active to workspaceSet", function() {
            expect(this.page.workspaceSet.attributes.active).toBe(true);
        });

        it("passes the userId to workspaceSet", function() {
            expect(this.page.workspaceSet.attributes.userId).toBe("foo");
        });

        it("fetches only the data sources where the user has permissions", function() {
            expect(this.page.dataSourceSet).toBeA(chorus.collections.DataSourceSet);
            expect(this.page.dataSourceSet.attributes.accessible).toBe(true);
            expect(this.page.dataSourceSet).toHaveBeenFetched();
        });

        it("fetches the hadoop instances", function() {
            expect(this.page.hadoopInstanceSet).toBeA(chorus.collections.HadoopInstanceSet);
            expect(this.page.hadoopInstanceSet).toHaveBeenFetched();
        });

        it("fetches the gnip instances", function() {
            expect(this.page.gnipInstanceSet).toBeA(chorus.collections.GnipInstanceSet);
            expect(this.page.gnipInstanceSet).toHaveBeenFetched();
        });

        it("passes the instance set through to the instance list view", function() {
            var packedUpDataSourceSet = this.page.dataSourceSet.map(function(instance) {
                return new chorus.models.Base(instance);
            });
            var packedUpHadoopSet = this.page.hadoopInstanceSet.map(function(instance) {
                return new chorus.models.Base(instance);
            });
            var packedUpGnipSet = this.page.gnipInstanceSet.map(function(instance) {
                return new chorus.models.Base(instance);
            });
            var packedUpInstanceSet = new chorus.collections.Base();
            packedUpInstanceSet.add(packedUpGnipSet);
            packedUpInstanceSet.add(packedUpDataSourceSet);
            packedUpInstanceSet.add(packedUpHadoopSet);

            expect(packedUpInstanceSet.length).toBe(this.page.mainContent.instanceList.collection.length);
        });

        describe("when an instance is added", function() {
            beforeEach(function() {
                spyOn(this.page, "fetchInstances");
                chorus.PageEvents.broadcast("instance:added");
            });

            it("re-fetches all instances", function() {
                expect(this.page.fetchInstances).toHaveBeenCalled();
            });
        });
    });
});
