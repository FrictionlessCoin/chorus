describe("chorus.views.FunctionTab", function () {
    beforeEach(function () {
        this.schema = backboneFixtures.workspace({ sandboxInfo:{ name:"righteous_tables" } }).sandbox().schema();
        this.modalSpy = stubModals();
        spyOn(this.schema.functions(), "fetch").andCallThrough();
        this.view = new chorus.views.FunctionTab({schema:this.schema});
    });

    it("should fetch the functions for the sandbox", function () {
        expect(this.schema.functions().fetch).toHaveBeenCalled();
    });

    it("should set the functionSet as the resource", function () {
        expect(this.view.resource).toBe(this.schema.functions());
    });

    describe("> render", function () {
        context("when there's no schema associated", function () {
            beforeEach(function () {
                this.view = new chorus.views.FunctionTab({schema:null});
                this.view.render();
            });

            it("should display 'no database/schema associated' message", function () {
                expect(this.view.$(".empty_selection")).toExist();
            });

            it("should not display the loading section", function () {
                expect(this.view.$(".loading_section")).not.toExist();
            });
        });

        context("> when schema is associated", function () {
            beforeEach(function () {
                this.menu = stubQtip(".context a");
                this.functionQtip = stubQtip(".list li .name");
                this.view.render();
                $('#jasmine_content').append(this.view.el);
            });

            it("should show the loading section", function () {
                expect(this.view.$('.loading_section')).toExist();
            });

            it("should not display 'no database/schema associated' message", function () {
                expect(this.view.$(".empty_selection")).not.toExist();
            });

            it("fetches all of the schemas in the sandbox's database", function () {
                expect(this.server.lastFetchFor(this.schema.database().schemas())).toBeTruthy();
            });

            context("> after functions and schemas have loaded", function () {
                beforeEach(function () {
                    this.server.completeFetchFor(this.schema.database().schemas(), [
                        this.schema,
                        backboneFixtures.schema({ name:"awesome_tables", id:"5" }),
                        backboneFixtures.schema({ name:"orphaned_tables", id:"6" })
                    ]);
                    this.server.completeFetchFor(this.view.collection, backboneFixtures.schemaFunctionSet([
                        {
                            name:"a_laplace_transform",
                            argTypes:[ "text", "int4", "float64" ],
                            argNames:[ "name", "age", "height" ],
                            description:'Looooooooooooong description. Looooooooooooong description. Looooooooooooong description. Looooooooooooong description. Looooooooooooong description. '
                        },
                        {
                            name:"inc",
                            description:null
                        }
                    ]).models);
                });

                it("should have data-cid on the list elements", function() {
                    expect(this.view.$('ul.list li')).toExist();
                    expect(this.view.$('ul.list li').data('cid')).toBeTruthy();
                });

                it("should have a collection defined", function() {
                    expect(this.view.collection).toBeTruthy();
                });

                it("should have the fullname on the list elements", function() {
                    expect(this.view.$('ul.list li')).toExist();
                    expect(this.view.$('ul.list li').data('fullname')).toBeTruthy();
                });

                it("should make the list elements draggable", function() {
                    spyOn($.fn, "draggable");
                    this.view.render();
                    expect($.fn.draggable).toHaveBeenCalledOnSelector("ul.list li");
                });

                it("the draggable helper has the name of the table", function() {
                    var $li = this.view.$("ul.list li:eq(0)");
                    var helper = this.view.dragHelper({currentTarget: $li});
                    expect(helper).toHaveClass("drag_helper");
                    expect(helper).toContainText($li.data("name"));
                });

                it("should not show the loading section", function () {
                    expect(this.view.$('.loading_section')).not.toExist();
                });

                it("should have the correct search placeholder text", function () {
                    expect(this.view.$("input.search").attr("placeholder")).toMatchTranslation("schema.functions.list.hint");
                });

                it("should render the functions", function () {
                    expect(this.view.$("ul li")).toContainText("a_laplace_transform");
                    expect(this.view.$("ul li")).toContainText("inc");
                });

                it("should not show the 'no functions found' text", function () {
                    expect(this.view.$('.none_found')).not.toExist();
                });

                it("should display the current schema name", function () {
                    expect(this.view.$('.context')).toContainText("righteous_tables");
                });

                context("when hovering on function name", function () {
                    beforeEach(function () {
                        this.view.$(".list li:eq(0) .name").mouseenter();
                    });

                    it("opens a chorus function detail description", function () {
                        expect(this.functionQtip).toHaveVisibleQtip();
                    });

                    it("displays the function arguments, in parens and separated by commas", function () {
                        expect(this.functionQtip.find(".arguments")).toContainText("(text name, int4 age, float64 height)");
                    });

                    it("ellipsizes the comments if they are long", function () {
                        expect(this.functionQtip.find(".comment")).toContainText('...');
                    });

                    it("has a link that opens a dialog showing the function info", function () {
                        var moreLink = this.functionQtip.find("a.more");
                        expect(moreLink).toHaveClass("alert");
                        expect(moreLink).toHaveData("alert", "FunctionInfo");
                        expect(moreLink.text()).toMatchTranslation("schema.functions.show_more");
                        expect(moreLink).toHaveData("model", this.view.collection.at(0));
                    });
                });

                context("when hovering over the function without a description", function () {
                    beforeEach(function () {
                        this.view.$(".list li:eq(1) .name").mouseenter();
                    });

                    it("does not print null when description is null", function () {
                        expect(this.functionQtip.find(".comment")).toBeEmpty();
                    });
                });

                describe("> selecting a schema", function () {
                    beforeEach(function () {
                        this.view.$(".context a").click();
                    });

                    it("opens a chorus menu", function () {
                        expect(this.menu).toHaveVisibleQtip();
                    });

                    it("shows a check mark next to the current schema", function () {
                        expect(this.view.$("li:contains('righteous_tables')")).toContain('.fa-check');
                        expect(this.view.$("li:contains('awesome_tables')")).not.toContain('.fa-check');
                    });

                    it("shows the names of all of the workspace's database's schemas", function () {
                        expect(this.menu.find("li").length).toBe(3);
                        expect(this.menu).toContainText("righteous_tables");
                        expect(this.menu).toContainText("awesome_tables");
                        expect(this.menu).toContainText("orphaned_tables");
                    });

                    describe("when a schema is clicked", function () {
                        beforeEach(function () {
                            this.menu.find("a[data-id=5]").click();
                            this.otherSchema = this.view.schemas.get("5");
                        });

                        it("should fetch the functions for the new schema", function () {
                            expect(this.server.lastFetchFor(this.otherSchema.functions())).not.toBeUndefined();
                        });

                        it("should show the loading spinner", function () {
                            expect(this.view.$('.loading_section')).toExist();
                        });

                        describe("when the function fetch completes", function () {
                            beforeEach(function () {
                                this.server.completeFetchFor(this.view.collection, backboneFixtures.schemaFunctionSet().models);
                            });

                            it("removes the loading spinner", function () {
                                expect(this.view.$('.loading_section')).not.toExist();
                                expect(this.view.$(".none_found")).not.toExist();
                            });

                            it("shows the new schema name as context", function () {
                                expect(this.view.$(".context")).toContainText("awesome_tables");
                            });

                            it("shows the new functions in the sidebar", function () {
                                expect(this.view.$("ul")).toExist();

                                expect(this.view.$("ul li")).toContainText(this.view.collection.at(0).name());
                                expect(this.view.$("ul li")).toContainText(this.view.collection.at(1).name());
                                expect(this.view.$("ul li")).toContainText(this.view.collection.at(2).name());
                                expect(this.view.$('ul li:eq(0) .name').attr('title')).toBe(this.view.collection.models[0].toHintText());
                            });
                        });
                    });
                });
            });

            context("when the functions fail to load", function () {
                context("fails with forbidden", function () {
                    beforeEach(function () {
                        this.server.lastFetchFor(this.schema.database().schemas()).failForbidden();

                        this.server.lastFetchFor(this.view.collection).failForbidden();
                    });

                    it("does not show the loading spinner", function () {
                        expect(this.view.$(".loading_section")).not.toExist();
                    });

                    it("should display an option to enter credentials", function () {
                        expect(this.view.$('.no_credentials')).toExist();
                    });

                    itBehavesLike.aDialogLauncher(".no_credentials .add_credentials", chorus.dialogs.DataSourceAccount);
                });

                context("fails with unprocessable entity", function () {
                    beforeEach(function () {
                        this.server.completeFetchFor(this.schema.database().schemas(), [
                            this.schema,
                            backboneFixtures.schema({ name:"awesome_tables", id:"5" }),
                            backboneFixtures.schema({ name:"orphaned_tables", id:"6" })
                        ]);

                        this.server.lastFetchFor(this.view.collection).failUnprocessableEntity(
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

            context("when the schema has no functions", function () {
                beforeEach(function () {
                    this.server.completeFetchFor(this.schema.database().schemas());
                    this.server.completeFetchFor(this.view.collection, []);
                });

                it("should show the 'no functions found' text", function () {
                    expect(this.view.$('.none_found')).toContainTranslation("schema.functions.none_found");
                });
            });
        });

    });
});
