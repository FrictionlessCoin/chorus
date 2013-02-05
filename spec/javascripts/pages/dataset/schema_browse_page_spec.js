describe("chorus.pages.SchemaBrowsePage", function() {
    beforeEach(function() {
        spyOn(_, "debounce").andCallThrough();
        this.schema = rspecFixtures.schema({id: "789", name: "Bar/", database: {id: "456", name: "Foo%", instance: {id: "123", name: "AnInstance"}} });
        this.instance = rspecFixtures.gpdbDataSource({ id: "123" });
        this.page = new chorus.pages.SchemaBrowsePage("789");
    });

    it("has a helpId", function() {
        expect(this.page.helpId).toBe("schema");
    });

    it("does not show a title before the fetch completes", function() {
        this.page.render();
        expect(this.page.$(".content_header h1").text()).toBe("");
    });

    it("includes the InstanceCredentials mixin", function() {
        expect(this.page.dependentResourceForbidden).toBe(chorus.Mixins.InstanceCredentials.page.dependentResourceForbidden);
    });

    it("fetches the schema's datasets", function() {
        expect(this.server.lastFetchFor(this.page.collection).params()['per_page']).toEqual("50");
    });

    describe("when a fetch fails", function() {
        beforeEach(function() {
            spyOn(Backbone.history, "loadUrl");
        });

        it("navigates to the 404 page when the schema fetch fails", function() {
            this.page.schema.trigger('resourceNotFound', this.page.schema);
            expect(Backbone.history.loadUrl).toHaveBeenCalledWith("/invalidRoute");
        });

        it("navigates to the 404 page when the collection fetch fails", function() {
            this.page.collection.trigger('resourceNotFound', this.page.collection);
            expect(Backbone.history.loadUrl).toHaveBeenCalledWith("/invalidRoute");
        });
    });

    context("when only the schema has been fetched", function() {
        beforeEach(function() {
            this.server.completeFetchFor(this.schema);
        });

        it("renders the schema's canonical name", function() {
            expect($(this.page.el)).toContainText(this.page.schema.canonicalName());
        });

        it("displays a loading section", function() {
            expect(this.page.$(".loading_section")).toExist();
        });
    });

    context("after everything has been fetched", function() {
        beforeEach(function() {
            this.server.completeFetchFor(this.schema);
            this.server.completeFetchFor(this.page.collection, [
                rspecFixtures.dataset({ objectName: "bar" }),
                rspecFixtures.dataset({ objectName: "foo", objectType: "VIEW" })
            ]);
        });

        it("passes the multiSelect option to the list content details", function() {
            expect(this.page.mainContent.contentDetails.options.multiSelect).toBeTruthy();
        });

        it("renders a checkbox next to each dataset", function() {
            expect(this.page.$("li input[type=checkbox]").length).toBe(this.page.collection.length);
        });

        it("displays the search input", function() {
            expect(this.page.$("input.search").attr("placeholder")).toMatchTranslation("schema.search");
        });

        it("pre-selects the first item", function() {
            expect(this.page.$(".list > li").eq(0)).toHaveClass("selected");
        });

        it("changes the selection after clicking another item", function() {
            this.page.$(".list > li").eq(1).click();
            expect(this.page.$(".list > li").eq(0)).not.toHaveClass("selected");
            expect(this.page.$(".list > li").eq(1)).toHaveClass("selected");
        });

        it("has the right breadcrumbs", function() {
            expect(this.page.$("#breadcrumbs .breadcrumb a").eq(0)).toHaveHref("#/");
            expect(this.page.$("#breadcrumbs .breadcrumb a").eq(0)).toContainTranslation("breadcrumbs.home");

            expect(this.page.$("#breadcrumbs .breadcrumb a").eq(1)).toHaveHref("#/data_sources");
            expect(this.page.$("#breadcrumbs .breadcrumb a").eq(1)).toContainTranslation("breadcrumbs.instances");

            expect(this.page.$("#breadcrumbs .breadcrumb a").eq(2)).toContainText("AnInstance");
            expect(this.page.$("#breadcrumbs .breadcrumb a").eq(2)).toHaveHref(this.schema.database().instance().showUrl());

            expect(this.page.$("#breadcrumbs .breadcrumb a").eq(3)).toContainText("Foo%");
            expect(this.page.$("#breadcrumbs .breadcrumb a").eq(3)).toHaveHref(this.schema.database().showUrl());

            expect(this.page.$("#breadcrumbs .breadcrumb .slug").text()).toBe(this.page.schema.get("name"));
        });

        it("has the right title", function() {
            expect(this.page.$(".content_header h1").text()).toBe(this.page.schema.canonicalName());
        });

        it("constructs the main content list correctly", function() {
            expect(this.page.mainContent).toBeA(chorus.views.MainContentList);
            expect(this.page.mainContent.collection).toBe(this.page.collection);
            expect(this.page.mainContent.collection).toBeA(chorus.collections.DatasetSet);

            expect(this.page.$(this.page.mainContent.el).length).toBe(1);
        });

        describe("search", function() {
            beforeEach(function() {
                this.page.$("input.search").val("foo").trigger("keyup");
            });

            it("throttles the number of search requests", function() {
                expect(_.debounce).toHaveBeenCalled();
            });

            it("shows the Loading text in the count span", function() {
                expect($(this.page.$(".count"))).toContainTranslation("loading");
            });

            it("re-fetches the collection with the search parameters", function() {
                expect(this.server.lastFetch().url).toContainQueryParams({filter: "foo"});
            });

            context("when the fetch completes", function() {
                beforeEach(function() {
                    spyOn(this.page.mainContent, "render").andCallThrough();
                    spyOn(this.page.mainContent.content, "render").andCallThrough();
                    spyOn(this.page.mainContent.contentFooter, "render").andCallThrough();
                    spyOn(this.page.mainContent.contentDetails, "render").andCallThrough();
                    spyOn(this.page.mainContent.contentDetails, "updatePagination").andCallThrough();
                    this.server.completeFetchFor(this.page.collection);
                });

                it("updates the header, footer, and body", function() {
                    expect(this.page.mainContent.content.render).toHaveBeenCalled();
                    expect(this.page.mainContent.contentFooter.render).toHaveBeenCalled();
                    expect(this.page.mainContent.contentDetails.updatePagination).toHaveBeenCalled();
                });

                it("does not re-render the page or body", function() {
                    expect(this.page.mainContent.render).not.toHaveBeenCalled();
                    expect(this.page.mainContent.contentDetails.render).not.toHaveBeenCalled();
                });

                it("shows the Loading text in the count span", function() {
                    expect($(this.page.$(".count"))).not.toContainTranslation("loading");
                });
            });
        });

        describe("multiple selection", function() {
            it("does not display the multiple selection section", function() {
                expect(this.page.$(".multiple_selection")).toHaveClass("hidden");
            });

            context("when a row has been checked", function() {
                beforeEach(function() {
                    chorus.PageEvents.broadcast("dataset:checked", this.page.collection.clone());
                });

                it("displays the multiple selection section", function() {
                    expect(this.page.$(".multiple_selection")).not.toHaveClass("hidden");
                });

                it("has an action to associate datasets with workspace", function() {
                    expect(this.page.$(".multiple_selection a.associate")).toExist();
                });

                describe("clicking the 'associate with workspace' link", function() {
                    beforeEach(function() {
                        this.modalSpy = stubModals();
                        this.page.$(".multiple_selection a.associate").click();
                    });

                    it("launches the dialog for associating multiple datasets with a workspace", function() {
                        var dialog = this.modalSpy.lastModal();
                        expect(dialog).toBeA(chorus.dialogs.AssociateMultipleWithWorkspace);
                        expect(dialog.datasets).toBe(this.page.multiSelectSidebarMenu.selectedModels);
                    });
                });

                it("has an action to edit tags", function() {
                    expect(this.page.$(".multiple_selection a.edit_tags")).toExist();
                });

                describe("clicking the 'edit_tags' link", function() {
                    beforeEach(function() {
                        this.modalSpy = stubModals();
                        this.page.$(".multiple_selection a.edit_tags").click();
                    });

                    it("launches the dialog for editing tags", function() {
                        expect(this.modalSpy).toHaveModal(chorus.dialogs.EditTags);
                        expect(this.modalSpy.lastModal().collection).toBe(this.page.multiSelectSidebarMenu.selectedModels);
                    });
                });
            });
        });
    });
});
