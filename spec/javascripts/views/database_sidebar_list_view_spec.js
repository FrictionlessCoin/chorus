describe("chorus.views.DatabaseSidebarList", function() {
    context("when there is no schema", function() {
        beforeEach(function() {
            var subclass = chorus.views.DatabaseSidebarList.extend({
                templateName: "function_tab"
            });
            this.view = new subclass({schema: undefined});
        });

        describe("render", function() {
            beforeEach(function() {
                chorus.page = new chorus.pages.WorkspaceDatasetShowPage(1, 2);
                this.view.render();
            });

            it("should not crash", function() {
                expect($(this.view.el)).toHaveClass("function_tab");
            });
        });
    });

    context("when there is a schema", function() {
        context("when the schema's parent is a database", function () {
            beforeEach(function() {
                var object0 = new chorus.models.DynamicDataset();
                var object1 = new chorus.models.DynamicDataset();
                object0.cid = 'c44';
                object1.cid = 'c55';

                this.schema = backboneFixtures.workspace({ sandboxInfo: { name: "righteous_tables" } }).sandbox().schema();
                this.collection = new chorus.collections.Base([object0, object1]);

                spyOn(this.collection.models[0], 'toText').andReturn('object1');
                spyOn(this.collection.models[1], 'toText').andReturn('object2');
                var subclass = chorus.views.DatabaseSidebarList.extend({
                    templateName: "data_tab"
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

            describe("when the fetch completes", function() {
                beforeEach(function() {
                    this.qtip = stubQtip(".context a");
                    spyOn(this.view, 'closeQtip');

                    this.server.completeFetchFor(this.schema.database().schemas(), [
                        this.schema,
                        backboneFixtures.schema({ name: "awesome_tables", id: "5" }),
                        backboneFixtures.schema({ name: "orphaned_tables", id: "6" })
                    ]);
                });

                it("renders", function() {
                    expect(this.view.postRender).toHaveBeenCalled();
                });
                describe("selecting a schema", function() {
                    beforeEach(function() {
                        spyOn(this.view, 'fetchResourceAfterSchemaSelected');
                        this.view.$(".context a").click();
                    });

                    it("opens a chorus menu", function() {
                        expect(this.qtip).toHaveVisibleQtip();
                    });

                    it("shows a check mark next to the current schema", function() {
                        expect(this.view.$("li:contains('righteous_tables')")).toContain('.fa-check');
                        expect(this.view.$("li:contains('awesome_tables')")).not.toContain('.fa-check');
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
                    describe("workfile:changed", function() {
                        beforeEach(function() {
                            this.server.reset();
                        });

                        context("when the execution schema is in the same database as the view's schema", function() {
                            beforeEach(function() {
                                this.executionSchema = backboneFixtures.schema({id: 101, name: 'other_schema', database: this.schema.get('database')});
                                this.workfile = new chorus.models.Workfile(backboneFixtures.workfile.sql({executionSchema: this.executionSchema.attributes}));
                                chorus.PageEvents.trigger("workfile:changed", this.workfile);
                            });

                            it("does not fetch anything", function() {
                                expect(this.server.fetches().length).toBe(0);
                                expect(this.view.schema.id).toEqual(this.executionSchema.id);
                            });
                        });

                        context("when the execution schema is not in the same database as the view's schema", function() {
                            beforeEach(function() {
                                this.executionSchema = backboneFixtures.schema({id: 101, name: 'other_schema', database: {id: 102, name: 'other_database'}});
                                this.workfile = new chorus.models.Workfile(backboneFixtures.workfile.sql({executionSchema: this.executionSchema.attributes}));
                                chorus.PageEvents.trigger("workfile:changed", this.workfile);
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

        context("when the schema's parent is a data source", function () {
            beforeEach(function () {
                this.schema = backboneFixtures.oracleSchema();

                var subclass = chorus.views.DatabaseSidebarList.extend({ templateName: "data_tab" });
                this.view = new subclass({collection: this.collection, schema: this.schema });

                this.view.render();
            });

            it("fetches the schemas", function() {
                expect(this.server.lastFetchFor(this.schema.dataSource().schemas())).toBeDefined();
            });
        });
    });

    context("when there are no valid credentials", function() {
        beforeEach(function() {
            this.modalSpy = stubModals();
            this.schema = backboneFixtures.workspace({ sandboxInfo: { name: "righteous_tables" } }).sandbox().schema();
            this.collection = new chorus.collections.Base([]);

            var subclass = chorus.views.DatabaseSidebarList.extend({
                templateName: "data_tab"
            });

            this.view = new subclass({collection: this.collection, schema: this.schema });

            spyOn(this.view, "postRender").andCallThrough();
            this.server.lastFetchAllFor(this.schema.database().schemas()).failForbidden();
        });

        it("should show the missing credentials error messages", function() {
            expect(this.view.$('.no_credentials')).toContainTranslation("dataset.credentials.missing.body", {
                linkText: t("dataset.credentials.missing.linkText"),
                dataSourceName: this.schema.database().dataSource().name()
            });
        });

        itBehavesLike.aDialogLauncher(".add_credentials", chorus.dialogs.DataSourceAccount);
    });
});
