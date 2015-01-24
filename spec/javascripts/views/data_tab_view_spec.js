describe("chorus.views.DataTab", function () {
    beforeEach(function () {
        spyOn(chorus.PageEvents, "trigger").andCallThrough();

        chorus.page = { workspace:backboneFixtures.workspace({name:"workspace_new"}) };
        this.schema = chorus.page.workspace.sandbox().schema();
        spyOn(chorus.views.DataTabDatasetList.prototype, "rebuildDatasetViews").andCallThrough();
        this.view = new chorus.views.DataTab({schema:this.schema});

        this.modalSpy = stubModals();
        this.schemaMenuQtip = stubQtip(".context a");
    });

    describe("the schema drop-down menu", function () {
        context("when a schema is selected", function () {
            beforeEach(function () {
                this.view.fetchResourceAfterSchemaSelected();
            });

            it("should fetch all the schemas", function () {
                expect(this.server.lastFetchFor(this.schema.database().schemas())).toBeDefined();
            });

            it("should fetch the schema's tables and views", function () {
                expect(this.schema.datasets()).toHaveBeenFetched();
            });

            context("when the schema fetches complete", function () {
                var schemas;
                beforeEach(function () {
                    schemas = new chorus.collections.SchemaSet([
                        backboneFixtures.schema({name:"Schema 1"}),
                        backboneFixtures.schema({name:"Schema 2"})
                    ]);

                    spyOn(this.view, "render").andCallThrough();
                    this.server.completeFetchFor(this.view.schemas, schemas.models);
                    this.server.completeFetchFor(this.schema.datasets(), [
                        backboneFixtures.dataset({ objectName:"Data1", entitySubtype:"SANDBOX_TABLE", objectType:"VIEW" })
                    ]);
                    this.view.render();

                    // Just to get the qtip to exist in the dom
                    this.view.$(".context a").click();
                });

                it("shows all the schemas in the popup menu", function () {
                    expect(this.schemaMenuQtip.find("a").length).toBe(3);
                    expect(this.schemaMenuQtip.find("a").eq(0)).toContainTranslation("database.sidebar.this_workspace");
                    expect(this.schemaMenuQtip.find("a").eq(1)).toContainText("Schema 1");
                    expect(this.schemaMenuQtip.find("a").eq(2)).toContainText("Schema 2");
                });

                describe("clicking on a schema", function () {
                    beforeEach(function () {
                        spyOn(this.view, "fetchResourceAfterSchemaSelected").andCallThrough();
                        this.schemaMenuQtip.$("a:eq(0)").click();
                    });

                    it("re-renders the list of datasets for the new schema", function () {
                        expect(this.view.fetchResourceAfterSchemaSelected).toHaveBeenCalled();
                    });
                });

                describe("searching for a dataset", function () {
                    beforeEach(function () {
                        this.server.reset();
                        this.view.listview.rebuildDatasetViews.andCallFake(function(){});
                        this.view.$("input.search").val("foo").trigger("keyup");
                    });

                    it("should re-fetch the collection using the search parameters", function () {
                        expect(this.server.lastFetch().url).toContainQueryParams({filter:"foo"});
                    });

                    context("when the fetch completes", function () {
                        beforeEach(function () {
                            this.view.render.reset();
                            this.server.lastFetch().succeed();
                        });

                        it("renders the list view", function () {
                            expect(this.view.render).not.toHaveBeenCalled();
                            expect(this.view.listview.rebuildDatasetViews).toHaveBeenCalled();
                        });
                    });
                });

                describe("fetching more datasets", function () {
                    beforeEach(function () {
                        this.view.collection.pagination = {page:1, total:2, records:51};
                        this.view.render();
                        spyOn(this.view.listview, "render");
                        this.server.reset();
                        this.view.$('a.more').click();
                    });

                    it("fetches more of the collection", function () {
                        expect(this.server.lastFetch().url).toContainQueryParams({page:2});
                    });

                    context("when the fetch succeeds", function () {
                        beforeEach(function () {
                            this.view.listview.render.reset();
                            this.server.completeFetchFor(this.schema.datasets(), [
                                backboneFixtures.dataset({ objectName:"Data1", entitySubtype:"SANDBOX_TABLE", objectType:"VIEW" })
                            ], {page:2});
                        });

                        it("renders the list view", function () {
                            expect(this.view.listview.render).toHaveBeenCalled();
                        });
                    });
                });
            });
        });

        context("when the 'this workspace' schema is selected", function () {
            context("and there is a focus schema", function () {
                beforeEach(function () {
                    spyOn(this.view, 'render');
                    this.view.focusSchema = this.schema;
                    this.view.setSchemaToCurrentWorkspace();
                    this.view.fetchResourceAfterSchemaSelected();
                });

                it("fetches all the datasets in the workspace, scoped to the database of the focus schema", function () {
                    var datasetSet = new chorus.collections.WorkspaceDatasetSet([], {
                        workspaceId:chorus.page.workspace.get("id"),
                        database: this.view.focusSchema.database()
                    });
                    datasetSet.sortAsc("objectName");

                    expect(this.server.lastFetchFor(datasetSet)).toBeDefined();
                });

                it("does not sort the datasets on the client side", function () {
                    expect(this.view.collection.attributes.unsorted).toBeTruthy();
                });

                it("renders the datasets after the fetch completes", function() {
                    this.server.completeFetchFor(this.view.collection, [backboneFixtures.dataset()]);
                    expect(this.view.render).toHaveBeenCalled();
                });
            });

            context("and there is no focus schema", function () {
                beforeEach(function () {
                    delete this.view.focusSchema;
                    this.view.setSchemaToCurrentWorkspace();
                    this.view.fetchResourceAfterSchemaSelected();
                });

                it("fetches all the datasets in the workspace", function () {
                    var datasetSet = new chorus.collections.WorkspaceDatasetSet([], { workspaceId:chorus.page.workspace.get("id") });
                    datasetSet.sortAsc("objectName");
                    expect(this.server.lastFetchFor(datasetSet)).toBeDefined();
                });

                it("does not sort the datasets on the client side", function () {
                    expect(this.view.collection.attributes.unsorted).toBeTruthy();
                });
            });
        });
    });

    context("when there's no schema associated", function () {
        beforeEach(function () {
            this.view = new chorus.views.DataTab({schema:null});
            this.view.render();
        });

        it("should display 'no database/schema associated' message", function () {
            expect(this.view.$(".empty_selection")).toExist();
        });

        it("should not display the loading section", function () {
            expect(this.view.$(".loading_section")).not.toExist();
        });
    });

    context("when there's sandbox/default schema associated", function () {

        it("displays the loading spinner", function () {
            this.view.render();
            expect(this.view.$(".loading_section")).toExist();
        });

        context("after the tables and views are loaded", function () {
            beforeEach(function () {
                this.server.completeFetchFor(this.schema.datasets(), [
                    backboneFixtures.dataset({ objectName:"Data1", entitySubtype:"SANDBOX_TABLE", objectType:"VIEW" })
                ]);
                this.qtip = stubQtip("li");
                this.view.render();
            });

            it("doesn't display a loading spinner", function () {
                expect(this.view.$(".loading_section")).not.toExist();
            });

            context("and some data was fetched", function () {
                beforeEach(function () {
                    spyOn(this.view, 'closeQtip');
                    this.server.completeFetchFor(this.schema.database().schemas());
                });

                it("should have a collection defined", function() {
                    expect(this.view.collection).toBeTruthy();
                });

                it("should have the fullname on the list elements", function() {
                    expect(this.view.$('ul.list li')).toExist();
                    expect(this.view.$('ul.list li').data('fullname')).toBeTruthy();
                });
            });

            context("and no data was fetched", function () {
                beforeEach(function () {
                    this.server.completeFetchFor(this.schema.database().schemas(), []);
                    this.view.collection.models = [];
                    this.view.render();
                });

                it("should display a message saying there are no tables/views", function () {
                    expect(this.view.$('.none_found')).toExist();
                    expect(this.view.$('.none_found').text().trim()).toMatchTranslation("schema.metadata.list.empty");
                });
            });
        });

        context("if the tables and views fetch fails", function () {
            context("when the user doesn't have an account for the data source", function () {
                beforeEach(function () {
                    this.server.lastFetchFor(this.schema.database().schemas()).failForbidden();
                    this.server.lastFetchFor(this.schema.datasets()).failForbidden();
                    this.view.render();
                });

                it("should display an option to enter credentials", function () {
                    expect(this.view.$('.no_credentials')).toExist();
                });

                itBehavesLike.aDialogLauncher(".no_credentials .add_credentials", chorus.dialogs.DataSourceAccount);
            });

            context("when the user's account doesn't have access to the schema", function() {
                beforeEach(function () {
                    this.server.completeFetchFor(this.schema.database().schemas());
                    this.server.lastFetchFor(this.schema.datasets()).failForbidden();
                    this.view.render();
                });

                it("does not show the loading spinner", function () {
                    expect(this.view.$(".loading_section")).not.toExist();
                });

                it("shows the insufficient credentials warning", function() {
                    expect(this.view.$(".no_credentials")).toContainTranslation("dataset.credentials.insufficient", {dataSourceName: this.schema.database().dataSource().name(), schemaName: this.schema.name()});
                });
            });

            context("when the tables and views fetch fails", function () {
                beforeEach(function () {
                    this.server.completeFetchFor(this.schema.database().schemas());
                    this.server.lastFetchFor(this.schema.datasets()).failUnprocessableEntity(
                        {message:"Data Source is unavailable"}
                    );
                });

                it("does not show the loading spinner", function () {
                    expect(this.view.$(".loading_section")).not.toExist();
                });

                it("shows the error message", function () {
                    expect(this.view.$(".notice")).toContainText("Data Source is unavailable");
                });
            });
        });
    });

    describe("after workfile changed", function () {
        beforeEach(function () {
            this.executionSchema = backboneFixtures.workspace().sandbox().schema();
        });

        context("when the workfile execution schema is this workspace", function() {
            beforeEach(function() {
                this.view.setSchemaToCurrentWorkspace();
                chorus.PageEvents.trigger("workfile:changed", backboneFixtures.workfile.text({executionSchema: this.executionSchema.attributes}));
            });

            it("updates focusSchema", function () {
                expect(this.view.focusSchema.canonicalName()).toBe(this.executionSchema.canonicalName());
            });
        });

        context("when the workfile execution schema is anything else", function() {
            beforeEach(function() {
                chorus.PageEvents.trigger("workfile:changed", backboneFixtures.workfile.text({executionSchema: this.executionSchema.attributes}));
            });

            it("updates focusSchema", function () {
                expect(this.view.focusSchema.canonicalName()).toBe(this.executionSchema.canonicalName());
            });
        });

    });


});
