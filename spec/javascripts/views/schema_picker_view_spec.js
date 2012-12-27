describe("chorus.views.SchemaPicker", function() {
    describe("#render", function() {
        function itDisplaysLoadingPlaceholderFor(type) {
            it("displays the loading placeholder for " + type, function() {
                expect(this.view.$("." + type + " .loading_text")).not.toHaveClass("hidden");
                expect(this.view.$("." + type + " select")).toBeHidden();
                expect(this.view.$('.' + type + ' label ')).not.toHaveClass("hidden");
                expect(this.view.$('.' + type + ' .unavailable')).toHaveClass("hidden");

                // Remove when adding "register a new instance" story
                if(type !== "instance") {
                    expect(this.view.$('.' + type + ' a')).not.toHaveClass("hidden");
                }
            });
        }

        function itDisplaysDefaultOptionFor(type) {
            it("displays the default option for '" + type + "'", function() {
                expect(this.view.$("." + type + " select option:eq(0)").text()).toMatchTranslation("sandbox.select_one");
            });
        }

        function itShouldResetSelect(type, changeArgument) {
            it("should reset " + type + " select", function() {
                expect(this.view.$('.' + type + ' select option:selected').val()).toBeFalsy();
                expect(this.view.$('.' + type + ' select option').length).toBe(1);
                expect('clearErrors').toHaveBeenTriggeredOn(this.view);
            });

            itTriggersTheChangeEvent(changeArgument);
        }

        function itHidesSection(type) {
            it("should hide the " + type + " section", function() {
                expect(this.view.$('.' + type)).toHaveClass("hidden");
            });
        }

        function itPopulatesSelect(type) {
            it("populates the select for for " + type + "s", function() {
                var escapedName = Handlebars.Utils.escapeExpression(this.view[type + "s"].models[0].get('name'));
                expect(this.view.$("." + type + " select option:eq(1)").text()).toBe(escapedName);
            });
        }

        function itShowsSelect(type) {
            it("should show the " + type + " select and hide the 'unavailable' message", function() {
                expect(this.view.$('.' + type + ' label ')).not.toHaveClass("hidden");
                expect(this.view.$('.' + type + ' select option').length).toBeGreaterThan(1);
                expect(this.view.$('.' + type + ' select')).not.toHaveClass("hidden");
            });
        }

        function itShowsUnavailable(type) {
            it("should show the 'unavailable' text for the " + type + " section and hide the select", function() {
                expect(this.view.$('.' + type + ' .unavailable')).not.toHaveClass("hidden");
                expect(this.view.$('.' + type + ' .loading_text')).toHaveClass("hidden");
                expect(this.view.$('.' + type + ' .select_container')).toHaveClass("hidden");
            });
        }

        function itShowsUnavailableTextWhenResponseIsEmptyFor(type) {
            context("when the response is empty for " + type, function() {
                beforeEach(function() {
                    if(type === 'instance') {
                        this.server.completeFetchAllFor(this.view[type + 's'], []);
                    } else {
                        this.server.completeFetchFor(this.view[type + 's'], []);
                    }
                });

                itShowsUnavailable(type);
            });
        }

        function itShowsCreateFields(type) {
            it("shows the fields to create a new " + type, function() {
                expect(this.view.$(".create_container")).not.toHaveClass("hidden");
                expect(this.view.$('.' + type + ' .unavailable')).toHaveClass("hidden");
                expect(this.view.$('.' + type + ' .loading_text')).toHaveClass("hidden");
                expect(this.view.$('.' + type + ' .select_container')).toHaveClass("hidden");
            });
        }

        function itTriggersTheChangeEvent(expectedArg) {
            it("triggers the 'change' event on itself", function() {
                if(expectedArg === undefined) {
                    expect("change").toHaveBeenTriggeredOn(this.view);
                } else {
                    expect("change").toHaveBeenTriggeredOn(this.view, [expectedArg]);
                }
            });
        }

        function itSortsTheSelectOptionsAlphabetically(type) {
            it("sorts the select options alphabetically for " + type, function() {

                if(type === "instance") {
                    this.server.completeFetchAllFor(this.view.instances, [
                        rspecFixtures.gpdbInstance({name: "Zoo"}),
                        rspecFixtures.gpdbInstance({name: "Aardvark"}),
                        rspecFixtures.gpdbInstance({name: "bear"})
                    ]);
                } else if(type === "schema") {
                    this.server.completeFetchFor(this.view.schemas, [
                        rspecFixtures.schema({name: "Zoo"}),
                        rspecFixtures.schema({name: "Aardvark"}),
                        rspecFixtures.schema({name: "bear"})
                    ]);
                } else { // type === 'database'
                    this.server.completeFetchFor(this.view.databases, [
                        rspecFixtures.database({name: "Zoo"}),
                        rspecFixtures.database({name: "Aardvark"}),
                        rspecFixtures.database({name: "bear"})]);
                }

                expect(this.view.$("." + type + " select option:eq(1)").text()).toBe("Aardvark");
                expect(this.view.$("." + type + " select option:eq(2)").text()).toBe("bear");
                expect(this.view.$("." + type + " select option:eq(3)").text()).toBe("Zoo");
            });
        }

        beforeEach(function() {
            stubDefer();
            spyOn(chorus, 'styleSelect');
        });

        context("when instance is provided", function() {
            beforeEach(function() {
                this.instance = rspecFixtures.gpdbInstance();
                this.view = new chorus.views.SchemaPicker({ instance: this.instance });
                $("#jasmine_content").append(this.view.el);
                this.view.render();
            });

            it('does not try to fetch the instances', function() {
                expect(this.server.lastFetchAllFor(new chorus.collections.GpdbInstanceSet())).toBeUndefined();
            });

            it("displays the instance's name as a label instead of a select instances", function() {
                expect(this.view.$(".instance .title")).toContainText(this.instance.name());
                expect(this.view.$('.instance select')).not.toExist();
            });

            it("fetches the databases", function() {
                expect(this.server.lastFetchFor(this.instance.databases())).toBeDefined();
            });

            context("when clicking the 'new database' button", function() {
                it("empties the 'existing database' select", function() {
                    spyOn(this.view, 'clearDatabaseSelection');
                    this.view.createNewDatabase({ preventDefault: function() {
                    } });
                    expect(this.view.clearDatabaseSelection).toHaveBeenCalled();
                });
            });
        });

        context("when an instance and a database are provided", function() {
            beforeEach(function() {
                this.instance = rspecFixtures.gpdbInstance();
                this.database = rspecFixtures.database({instance: { id: this.instance.get("id") } });
                this.database.unset('id');
                this.view = new chorus.views.SchemaPicker({ instance: this.instance, database: this.database });

                $("#jasmine_content").append(this.view.el);
                this.view.render();
            });

            it('does not try to fetch the instances or the databases', function() {
                expect(this.server.lastFetchAllFor(new chorus.collections.GpdbInstanceSet())).toBeUndefined();
                expect(this.server.lastFetchAllFor(new chorus.collections.DatabaseSet({instanceId: this.instance.get("id")}))).toBeUndefined();
            });

            it("displays the instance and database names instead of selects for instances and databases", function() {
                expect(this.view.$(".instance .title")).toContainText(this.instance.name());
                expect(this.view.$(".database .title")).toContainText(this.database.name());

                expect(this.view.$('.instance select')).not.toExist();
                expect(this.view.$('.database select')).not.toExist();
            });

            it("fetches the schemas", function() {
                expect(this.server.lastFetchFor(this.database.schemas())).toBeDefined();
            });

            context("when the schema fetch completes", function() {
                beforeEach(function() {
                    spyOnEvent(this.view, 'change');
                    this.server.completeFetchFor(this.database.schemas(), [rspecFixtures.schema()]);
                    this.view.$(".schema select").prop("selectedIndex", 1).change();
                    $('#jasmine_content').append(this.view.el);
                });

                itTriggersTheChangeEvent(true);
            });
        });

        context("when nothing is provided", function() {
            context("when allowCreate is true", function() {
                beforeEach(function() {
                    this.view = new chorus.views.SchemaPicker({ allowCreate: true });
                    spyOnEvent(this.view, 'change');
                    spyOnEvent(this.view, 'clearErrors');
                    this.view.render();
                    this.dialogContainer = $("<div class='dialog sandbox_new'></div>").append(this.view.el);
                    $('#jasmine_content').append(this.dialogContainer);
                });

                it("renders creation markup", function() {
                    expect(this.view.$(".database a.new")).toExist();
                    expect(this.view.$(".database .create_container")).toExist();
                    expect(this.view.$(".schema a.new")).toExist();
                    expect(this.view.$(".schema .create_container")).toExist();
                });

                it("includes accessible=true by default", function() {
                    expect(this.server.lastFetch().url).toContainQueryParams({accessible: true});
                });

                it("renders a select for the instance", function() {
                    expect(this.view.$('.instance select')).toExist();
                    expect(this.view.$('.instance .title')).not.toExist();
                });

                it("fetches the list of instances", function() {
                    expect(this.server.requests[0].url).toMatch("/gpdb_instances/");
                });

                itDisplaysLoadingPlaceholderFor('instance');

                itShowsUnavailableTextWhenResponseIsEmptyFor('instance');

                itSortsTheSelectOptionsAlphabetically('instance');

                context("when the instance list fetch completes", function() {
                    beforeEach(function() {
                        this.server.completeFetchAllFor(this.view.instances, [
                            rspecFixtures.gpdbInstance({ name: "<script>alert(hi)<script>", shared: true, id: 1 }),
                            rspecFixtures.gpdbInstance({ shared: true, id: 2 }),
                            rspecFixtures.gpdbInstance({ shared: false, id: 3 })
                        ]);
                    });

                    itShowsSelect('instance');
                    itPopulatesSelect('instance');
                    itHidesSection('database');
                    itHidesSection('schema');

                    itDisplaysDefaultOptionFor('instance')

                    it("hides the loading placeholder", function() {
                        expect(this.view.$(".instance .loading_text")).toHaveClass("hidden")
                    });

                    describe("when the view re-renders due to its parent re-rendering", function() {
                        beforeEach(function() {
                            this.view.render();
                        });

                        it("still hides the loading placeholder", function() {
                            expect(this.view.$(".instance .loading_text")).toHaveClass("hidden");
                        });

                        it("keeps the same options in the instance select", function() {
                            expect(this.view.$("select[name=instance] option").length).toBe(4);
                        });
                    });

                    context("choosing an instance", function() {
                        beforeEach(function() {
                            this.view.$(".instance select").prop("selectedIndex", 1).change();
                            this.selectedInstance = this.view.instances.get(this.view.$('.instance select option:selected').val());
                        });

                        itDisplaysLoadingPlaceholderFor('database');
                        itHidesSection('schema');
                        itTriggersTheChangeEvent(false);

                        context("when the response is empty for databases", function() {
                            beforeEach(function() {
                                this.server.completeFetchFor(this.view.databases, []);
                            });

                            itShowsUnavailable("database");

                            describe("choosing another instance", function() {
                                beforeEach(function() {
                                    this.view.$(".instance select").prop("selectedIndex", 2).change();
                                });

                                itDisplaysLoadingPlaceholderFor('database');
                            });

                            describe("clicking 'new database'", function() {
                                beforeEach(function() {
                                    this.view.$(".database a.new").click();
                                });

                                itShowsCreateFields('database');
                            });
                        });

                        it("fetches the list of databases", function() {
                            expect(this.server.requests[1].url).toMatch("/gpdb_instances/" + this.selectedInstance.get('id') + "/databases");
                        });

                        itSortsTheSelectOptionsAlphabetically('database');

                        context("when the database list fetch completes", function() {
                            beforeEach(function() {
                                this.server.completeFetchFor(this.view.databases, [rspecFixtures.database(), rspecFixtures.database()]);
                            });

                            itShowsSelect('database');
                            itPopulatesSelect('database');
                            itDisplaysDefaultOptionFor('database');

                            it("hides the loading placeholder", function() {
                                expect(this.view.$(".database .loading_text")).toHaveClass("hidden");
                            });

                            it("shows the 'new database' link", function() {
                                expect(this.view.$(".database a.new")).not.toHaveClass("hidden");
                            });

                            context("creating a database", function() {
                                beforeEach(function() {
                                    this.view.$(".database a.new").click();
                                });

                                it("hides the database selector", function() {
                                    expect(this.view.$(".database select")).toBeHidden();
                                });

                                it("shows the database name, save, and cancel link", function() {
                                    expect(this.view.$(".database .create_container")).not.toHaveClass("hidden");
                                    expect(this.view.$(".database .create_container a.cancel")).not.toHaveClass("hidden");
                                });

                                it("shows the schema section", function() {
                                    expect(this.view.$(".schema")).not.toHaveClass("hidden");
                                });

                                it("shows the schema name field and cancel link", function() {
                                    expect(this.view.$(".schema .create_container")).not.toHaveClass("hidden");
                                    expect(this.view.$(".schema .create_container a.cancel")).toBeHidden();
                                });

                                it("has a default schema name of 'public'", function() {
                                    expect(this.view.$(".schema input.name").val()).toBe('public');
                                });

                                itTriggersTheChangeEvent(false);

                                describe("typing into the database name field", function() {
                                    beforeEach(function() {
                                        this.view._chorusEventSpies["change"].reset();
                                        this.view.$(".database input.name").val("db!").trigger("textchange");
                                    });

                                    itTriggersTheChangeEvent(true);
                                });

                                context("clicking the cancel link", function() {
                                    beforeEach(function() {
                                        this.view.$(".database input.name").val("my_database").keyup();
                                        this.view.$(".database .cancel").click();
                                    });

                                    it("hides the name, save, and cancel link", function() {
                                        expect(this.view.$(".database .create_container")).toHaveClass("hidden");
                                    });

                                    itTriggersTheChangeEvent(false);

                                    it("hides the schema section", function() {
                                        expect(this.view.$(".schema")).toHaveClass("hidden");
                                    });

                                    describe("choosing a database and then creating a schema", function() {
                                        beforeEach(function() {
                                            var select = this.view.$(".database select");
                                            select.prop("selectedIndex", 1);
                                            select.change();
                                            this.view.$(".schema a.new").click();
                                        });

                                        it("shows the cancel link", function() {
                                            expect(this.view.$(".schema a.cancel")).not.toHaveClass("hidden");
                                        });

                                        it("has no default schema name", function() {
                                            expect(this.view.$(".schema input.name").val()).toBe("");
                                        });
                                    });
                                });
                            });

                            context("choosing a database", function() {
                                beforeEach(function() {
                                    this.view._chorusEventSpies["change"].reset();
                                    var select = this.view.$(".database select");
                                    select.prop("selectedIndex", 1);
                                    select.change();
                                    this.selectedDatabase = this.view.databases.get(this.view.$('.database select option:selected').val());
                                });

                                itDisplaysLoadingPlaceholderFor('schema');
                                itTriggersTheChangeEvent(false);

                                it("fetches the list of schemas", function() {
                                    expect(this.server.requests[2].url).toMatch("/databases/" + this.selectedDatabase.get("id") + "/schemas");
                                });

                                itShowsUnavailableTextWhenResponseIsEmptyFor('schema');

                                itSortsTheSelectOptionsAlphabetically('schema');

                                context("when the schema list fetch completes", function() {
                                    beforeEach(function() {
                                        this.server.completeFetchAllFor(this.view.schemas, [rspecFixtures.schema({name: 'SCHEMA!'})]);
                                    });

                                    itShowsSelect("schema");
                                    itPopulatesSelect("schema");
                                    itDisplaysDefaultOptionFor('schema');

                                    it("hides the loading placeholder", function() {
                                        expect(this.view.$(".schema .loading_text")).toHaveClass("hidden");
                                    });

                                    it("shows the 'new schema' link", function() {
                                        expect(this.view.$(".schema a.new")).not.toHaveClass("hidden");
                                    });

                                    context("creating a schema", function() {
                                        beforeEach(function() {
                                            this.view.$(".schema a.new").click();
                                        });

                                        it("hides the schema selector", function() {
                                            expect(this.view.$(".schema .unavailable")).toHaveClass("hidden");
                                            expect(this.view.$(".schema .select_container")).toHaveClass("hidden");
                                        });

                                        it("hides the 'new schema' link", function() {
                                            expect(this.view.$(".schema a.new")).toHaveClass("hidden");
                                        });

                                        it("shows the schema name and cancel link", function() {
                                            expect(this.view.$(".schema .create_container")).not.toHaveClass("hidden");
                                            expect(this.view.$(".schema .create_container a.cancel")).not.toHaveClass("hidden");
                                        });

                                        it("has no default schema name", function() {
                                            expect(this.view.$(".schema input.name").val()).toBe("");
                                        });

                                        describe("typing into the schema name field", function() {
                                            beforeEach(function() {
                                                this.view._chorusEventSpies["change"].reset();
                                                this.view.$(".schema input.name").val('myschema').trigger("textchange");
                                            });

                                            itTriggersTheChangeEvent(true);
                                        });

                                        itTriggersTheChangeEvent(false);

                                        context("clicking the cancel link", function() {
                                            beforeEach(function() {
                                                this.view.$(".schema .cancel").click();
                                            });

                                            itTriggersTheChangeEvent(false);

                                            it("shows the schema selector", function() {
                                                expect(this.view.$(".schema .select_container")).not.toHaveClass("hidden");
                                            });

                                            it("shows the 'new schema' link", function() {
                                                expect(this.view.$(".schema a.new")).not.toHaveClass("hidden")
                                            });

                                            it("hides the schema name, and cancel link", function() {
                                                expect(this.view.$(".schema .create_container")).toHaveClass("hidden");
                                                expect(this.view.$(".schema .create_container a.cancel")).toBeHidden();
                                            });

                                            describe("when you click new database", function() {
                                                beforeEach(function() {
                                                    this.view.$(".database a.new").click();
                                                });

                                                it("should set the default schema name to 'public'", function() {
                                                    expect(this.view.$(".schema input.name").val()).toBe("public");
                                                });
                                            });
                                        });
                                    });

                                    context("choosing a schema", function() {
                                        beforeEach(function() {
                                            this.view._chorusEventSpies["change"].reset();
                                            var select = this.view.$(".schema select");
                                            select.prop("selectedIndex", 1);
                                            select.change();
                                            this.selectedSchema = this.view.schemas.get(this.view.$('.schema select option:selected').val());
                                        });

                                        itTriggersTheChangeEvent(true);

                                        context("un-choosing a schema", function() {
                                            beforeEach(function() {
                                                this.view._chorusEventSpies["change"].reset();
                                                this.view.$(".schema select").prop("selectedIndex", 0).change();
                                            });

                                            itTriggersTheChangeEvent(false);
                                        });

                                        describe("clicking the 'new database' link", function() {
                                            beforeEach(function() {
                                                this.view._chorusEventSpies["change"].reset();
                                                this.view.$(".database a.new").click();
                                            });

                                            itTriggersTheChangeEvent(false);
                                        });

                                        context("changing the database", function() {
                                            beforeEach(function() {
                                                var select = this.view.$(".database select");
                                                select.prop("selectedIndex", 2);
                                                this.view.schemas.loaded = false;
                                                select.change();
                                            });

                                            itShouldResetSelect('schema', false);

                                            context("changing the instance", function() {
                                                beforeEach(function() {
                                                    var select = this.view.$(".instance select");
                                                    select.prop("selectedIndex", 2);
                                                    select.change();
                                                });

                                                itShouldResetSelect('database', false);
                                                itShouldResetSelect('schema', false);
                                            });
                                        });

                                        context("changing the instance", function() {
                                            beforeEach(function() {
                                                this.view.$(".instance select")
                                                    .prop("selectedIndex", 2)
                                                    .change();
                                            });

                                            itHidesSection("schema");
                                            itShouldResetSelect('database', false);
                                            itShouldResetSelect('schema', false);
                                        });

                                        context("unselecting the database", function() {
                                            beforeEach(function() {
                                                var select = this.view.$(".database select");
                                                select.prop("selectedIndex", 0);
                                                select.change();
                                            });

                                            itHidesSection('schema');

                                            context("unselecting the instance", function() {
                                                beforeEach(function() {
                                                    var select = this.view.$(".instance select");
                                                    select.prop("selectedIndex", 0);
                                                    select.change();
                                                });

                                                itHidesSection('database');
                                            });
                                        });
                                    });
                                });

                                context("when the schema list fetch fails", function() {
                                    beforeEach(function() {
                                        spyOnEvent(this.view, 'error');
                                        this.server.lastFetchAllFor(this.view.schemas).failUnprocessableEntity({ fields: { a: { BLANK: {} } } });
                                    });

                                    it("hides the loading section", function() {
                                        expect(this.view.$(".schema .loading_text")).toHaveClass("hidden");
                                    });

                                    it("triggers error with the message", function() {
                                        expect("error").toHaveBeenTriggeredOn(this.view, [this.view.schemas]);
                                    });
                                });
                            });
                        });

                        context("when the database list fetch fails", function() {
                            beforeEach(function() {
                                spyOnEvent(this.view, 'error');
                                this.server.lastFetchAllFor(this.view.databases).failUnprocessableEntity({ fields: { a: { BLANK: {} } } });
                            });

                            it("hides the loading section", function() {
                                expect(this.view.$(".database .loading_text")).toHaveClass("hidden");
                            });

                            it("triggers error with the message", function() {
                                expect("error").toHaveBeenTriggeredOn(this.view, [this.view.databases]);
                            });
                        });
                    });
                });

                context("when the instance list fetch fails", function() {
                    beforeEach(function() {
                        spyOnEvent(this.view, 'error');
                        this.server.lastFetchAllFor(this.view.instances).failUnprocessableEntity({ fields: { a: { BLANK: {} } } });
                    });

                    it("triggers error with the message", function() {
                        expect("error").toHaveBeenTriggeredOn(this.view, [this.view.instances]);
                    });
                });

                context("when allowCreate is false", function() {
                    beforeEach(function() {
                        this.view = new chorus.views.SchemaPicker({ allowCreate: false });
                        this.view.render();
                        this.dialogContainer = $("<div class='dialog sandbox_new'></div>").append(this.view.el);
                        $('#jasmine_content').append(this.dialogContainer);
                    });

                    it("does not render creation markup", function() {
                        expect(this.view.$(".database a.new")).not.toExist();
                        expect(this.view.$(".database .create_container")).not.toExist();
                        expect(this.view.$(".schema a.new")).not.toExist();
                        expect(this.view.$(".schema .create_container")).not.toExist();
                    });
                });
            });
        });

        describe("#schemaId", function() {
            beforeEach(function() {
                this.view = new chorus.views.SchemaPicker({ allowCreate: true });
                $('#jasmine_content').append(this.view.el);
                this.view.render();
                this.server.completeFetchAllFor(this.view.instances, [ rspecFixtures.gpdbInstance({ id: '4' }) ]);
                this.view.$(".instance select").val("4").change();
                this.server.completeFetchFor(this.view.databases, [ rspecFixtures.database({ id: '5' }) ]);
                this.view.$(".database select").val("5").change();
                this.server.completeFetchAllFor(this.view.schemas, [ rspecFixtures.schema({ id: '6' }) ]);
                this.view.$(".schema select").val("6").change();
            });

            it("returns the selected schema id", function() {
                expect(this.view.schemaId()).toBe('6');
            });

            context("when you select a schema and then change your mind and choose 'new schema'", function() {
                beforeEach(function() {
                    this.view.$(".schema a.new").click();
                });

                it("returns undefined", function() {
                    expect(this.view.schemaId()).toBeUndefined();
                });
            });
        });

        describe("#fieldValues", function() {
            context("with an instance provided", function() {
                beforeEach(function() {
                    this.instance = rspecFixtures.gpdbInstance();
                    this.view = new chorus.views.SchemaPicker({ instance: this.instance });
                    this.view.render();
                    this.server.completeFetchFor(this.view.databases, [ rspecFixtures.database({ id: '5' }) ]);
                    this.view.$(".database select").val("5").change();
                    this.server.completeFetchAllFor(this.view.schemas, [ rspecFixtures.schema({ id: '6' }) ]);
                    this.view.$(".schema select").val("6").change();
                });

                it("uses the provided instance", function() {
                    expect(this.view.fieldValues()).toEqual({
                        instance: this.instance.get('id'),
                        database: '5',
                        schema: '6'
                    });
                });
            });

            context("with no instance provided", function() {
                beforeEach(function() {
                    this.view = new chorus.views.SchemaPicker({ allowCreate: true });
                    $('#jasmine_content').append(this.view.el);
                    this.view.render();
                    this.server.completeFetchAllFor(this.view.instances, [ rspecFixtures.gpdbInstance({ id: '4' }) ]);
                    this.view.$(".instance select").val("4").change();
                });

                context("when an instance, database, and schema are selected from the dropdowns", function() {
                    beforeEach(function() {
                        this.server.completeFetchFor(this.view.databases, [ rspecFixtures.database({ id: '5' }) ]);
                        this.view.$(".database select").val("5").change();
                        this.server.completeFetchAllFor(this.view.schemas, [ rspecFixtures.schema({ id: '6' }) ]);
                        this.view.$(".schema select").val("6").change();
                    });

                    it("returns instance, database, and schema ids", function() {
                        expect(this.view.fieldValues()).toEqual({
                            instance: '4',
                            database: '5',
                            schema: '6'
                        });
                    });
                });

                context("when the user enters new database and schema names", function() {
                    beforeEach(function() {
                        this.view.$(".database a.new").click();
                        this.view.$(".database input.name").val("New_Database");
                        this.view.$(".schema input.name").val("New_Schema").keyup();
                    });

                    it("returns the instance id and the database and schema names", function() {
                        expect(this.view.fieldValues()).toEqual({
                            instance: '4',
                            databaseName: 'New_Database',
                            schemaName: 'New_Schema'
                        });
                    });
                });
            });
        });

        describe("#ready", function() {
            beforeEach(function() {
                this.view = new chorus.views.SchemaPicker({ allowCreate: true });
            });

            context("when an instance, database, and schema are selected", function() {
                beforeEach(function() {
                    spyOn(this.view, "fieldValues").andReturn({
                        instance: 5,
                        database: 6,
                        schema: 7
                    });
                });

                it("return true", function() {
                    expect(this.view.ready()).toBeTruthy();
                });
            });

            context("when not completely specified", function() {
                context("with only an instance", function() {
                    beforeEach(function() {
                        spyOn(this.view, "fieldValues").andReturn({
                            instance: 5
                        });
                    });

                    it("return false", function() {
                        expect(this.view.ready()).toBeFalsy();
                    });
                });

                context("with an instance and a blank databaseName", function() {
                    beforeEach(function() {
                        spyOn(this.view, "fieldValues").andReturn({
                            instance: 5,
                            databaseName: ""
                        });
                    });

                    it("return false", function() {
                        expect(this.view.ready()).toBeFalsy();
                    });
                });

                context("with an instance, a database, and a blank schemaName", function() {
                    beforeEach(function() {
                        spyOn(this.view, "fieldValues").andReturn({
                            instance: 5,
                            database: 6,
                            schemaName: ""
                        });
                    });

                    it("return false", function() {
                        expect(this.view.ready()).toBeFalsy();
                    });
                });
            });
        });
    });
});
