describe("chorus.views.DatabaseSidebarList", function() {
    context("when there is no schema", function() {
        beforeEach(function() {
            var subclass = chorus.views.DatabaseSidebarList.extend({
                templateName: "database_function_sidebar_list"
            });
            this.view = new subclass({schema: undefined});
        });

        describe("#setup", function() {
            it("should not crash", function() {
                expect(this.view).toBeDefined();
            });
        });

        describe("render", function() {
            beforeEach(function() {
                chorus.page = new chorus.pages.WorkspaceDatasetShowPage(1, 2);
                this.view.render();
            });

            it("should not crash", function() {
                expect($(this.view.el)).toHaveClass("database_function_sidebar_list");
            });
        });
    });

    context("when there is a schema", function() {
        beforeEach(function() {
            var object0 = new chorus.models.Dataset();
            var object1 = new chorus.models.Dataset();
            object0.cid = 'c44';
            object1.cid = 'c55';

            this.schema = rspecFixtures.workspace({ sandboxInfo: { name: "righteous_tables" } }).sandbox().schema();
            this.collection = new chorus.collections.Base([object0, object1]);

            spyOn(this.collection.models[0], 'toText').andReturn('object1');
            spyOn(this.collection.models[1], 'toText').andReturn('object2');
            var subclass = chorus.views.DatabaseSidebarList.extend({
                templateName: "database_dataset_sidebar_list"
            });

            this.view = new subclass({collection: this.collection, schema: this.schema });

            spyOn(this.view, "postRender").andCallThrough();
            this.view.render();
        });

        it("fetches the schemas", function() {
            expect(this.server.lastFetchFor(this.schema.database().schemas())).toBeDefined();
        });

        it("does not render", function() {
            expect(this.view.postRender).not.toHaveBeenCalled();
        });

        context("when the fetch completes", function() {
            beforeEach(function() {
                this.qtip = stubQtip(".context a");
                spyOn(this.view, 'closeQtip');

                this.server.completeFetchFor(this.schema.database().schemas(), [
                    this.schema,
                    rspecFixtures.schema({ name: "awesome_tables", id: "5" }),
                    rspecFixtures.schema({ name: "orphaned_tables", id: "6" })
                ]);
            });

            it("renders", function() {
                expect(this.view.postRender).toHaveBeenCalled();
            });
            context("selecting a schema", function() {
                beforeEach(function() {
                    spyOn(this.view, 'fetchResourceAfterSchemaSelected');
                    this.view.$(".context a").click();
                });

                it("opens a chorus menu", function() {
                    expect(this.qtip).toHaveVisibleQtip();
                });

                it("shows a check mark next to the current schema", function() {
                    expect(this.view.$("li:contains('righteous_tables')")).toContain('.check');
                    expect(this.view.$("li:contains('awesome_tables')")).not.toContain('.check');
                });

                it("shows the names of all of the workspace's database's schemas", function() {
                    var $lis = this.qtip.find("li a");
                    expect($lis.length).toBe(4);
                    expect($lis.eq(0)).toContainText("this workspace");
                    expect($lis.eq(1)).toContainText("awesome_tables");
                    expect($lis.eq(2)).toContainText("orphaned_tables");
                    expect($lis.eq(3)).toContainText("righteous_tables");
                });

                describe("when a schema is clicked", function() {
                    beforeEach(function() {
                        this.qtip.find("a[data-id=5]").click();
                        this.otherSchema = this.view.schemas.get("5");
                    });

                    it("calls the 'fetchResourceAfterSchemaSelected' hook", function() {
                        expect(this.view.fetchResourceAfterSchemaSelected).toHaveBeenCalled();
                    });
                });
            });

            describe("event handling", function() {
                describe("workfile:executed", function() {
                    beforeEach(function() {
                        this.server.reset();
                    });

                    context("when the execution schema is in the same database as the view's schema", function() {
                        beforeEach(function() {
                            this.executionSchema = rspecFixtures.schema({id: 101, name: 'other_schema', database: this.schema.get('database')});
                            chorus.PageEvents.broadcast("workfile:executed", rspecFixtures.workfile.sql(), this.executionSchema);
                        });

                        it("does not fetch anything", function() {
                            expect(this.server.fetches().length).toBe(0);
                            expect(this.view.schema.id).toEqual(this.executionSchema.id);
                        });
                    });

                    context("when the execution schema is not in the same database as the view's schema", function() {
                        beforeEach(function() {
                            this.executionSchema = rspecFixtures.schema({id: 101, name: 'other_schema', database: {id: 102, name: 'other_database'}});
                            chorus.PageEvents.broadcast("workfile:executed", rspecFixtures.workfile.sql(), this.executionSchema);
                        });

                        it("fetches the execution schema", function() {
                            expect(this.executionSchema.database().schemas()).toHaveBeenFetched();
                            expect(this.view.schema.id).toEqual(this.executionSchema.id);
                        });
                    });
                });
            });
        });
    });

    context("when there are no valid credentials", function() {
        beforeEach(function() {
            this.schema = rspecFixtures.workspace({ sandboxInfo: { name: "righteous_tables" } }).sandbox().schema();
            this.collection = new chorus.collections.Base([]);
            this.collection.serverErrors = [
                {message: "Account map needed"}
            ];

            var subclass = chorus.views.DatabaseSidebarList.extend({
                templateName: "database_dataset_sidebar_list"
            });

            this.view = new subclass({collection: this.collection, schema: this.schema });

            spyOn(this.view, "postRender").andCallThrough();
            this.server.completeFetchFor(this.schema.database().schemas(), [
                this.schema,
                rspecFixtures.schema({ name: "awesome_tables", id: "5" }),
                rspecFixtures.schema({ name: "orphaned_tables", id: "6" })
            ]);
        });

        it("should show the missing credentials error messages", function() {
            expect(this.view.$('.no_credentials')).toContainTranslation("dataset.credentials.missing.body", {
                linkText: t("dataset.credentials.missing.linkText"),
                instanceName: this.schema.database().instance().name()
            });
        });
    });
});
