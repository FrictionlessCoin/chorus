describe("chorus.views.SearchResultList", function() {
    context("body", function() {
        beforeEach(function() {
            this.result = rspecFixtures.searchResult();
            this.result.set({ query: "foo" });

            var instances = this.result.instances();
            instances.pagination.records = 24;

            this.view = new chorus.views.SearchResultList({
                entityType: "instance",
                collection: instances,
                search: this.result
            });

            this.view.render();
        });

        it("has a list element for each model in the collection", function() {
            expect(this.view.$('li').length).toBe(3);
        });
    });

    describe("header", function() {
        beforeEach(function() {
            this.result = rspecFixtures.searchResult();
            this.result.set({query: "foo"});
            this.collection = this.result.users();
            this.view = new chorus.views.SearchResultList({ collection: this.collection, search: this.result, entityType: "user"});
        });

        context("when there are three or fewer results", function() {
            beforeEach(function() {
                this.collection = new chorus.collections.DatasetSet([
                    rspecFixtures.datasetJson(),
                    rspecFixtures.datasetJson()
                ]);
                this.collection.pagination = { records: 2 };
                this.view = new chorus.views.SearchResultList({collection: this.collection, search: this.result, entityType: "dataset"});
                this.view.render();
            });

            it("should show the short count", function() {
                expect(this.view.$(".count")).toContainTranslation('search.count_short', {count: 2});
                expect(this.view.$(".show_all")).not.toExist();
            });
        });

        context("unfiltered search results", function() {
            beforeEach(function() {
                this.view.render();
            });

            describe("details bar", function() {
                it("has a title", function() {
                    expect(this.view.$(".title")).toContainTranslation("search.users.title");
                });

                context("has no additional results", function() {
                    beforeEach(function() {
                        this.collection.pagination.records = this.collection.models.length;
                        this.view.render();
                    });

                    it("has a short count", function() {
                        expect(this.view.$(".count")).toContainTranslation("search.count_short", {count: this.collection.models.length});
                    });

                    it("has no showAll link", function() {
                        expect(this.view.$("a.show_all")).not.toExist();
                    });
                });

                context("has additional results", function() {
                    beforeEach(function() {
                        this.collection.pagination.records = this.collection.models.length + 1;
                        this.view.render();
                    });

                    it("has a long count", function() {
                        expect(this.view.$(".count")).toContainTranslation("search.count", {
                            shown: this.collection.models.length,
                            total: (this.collection.models.length + 1)
                        });
                    });

                    it("has a showAll link", function() {
                        expect(this.view.$("a.show_all")).toContainTranslation("search.show_all");
                        expect(this.view.$("a.show_all").data("type")).toBe("user");
                    });

                    context("clicking the show all link", function() {
                        beforeEach(function() {
                            spyOn(chorus.router, "navigate");
                            this.view.search.set({ workspaceId: 123 });
                            this.view.$("a.show_all").click();
                        });

                        it("should navigate to the appropriate results page", function() {
                            expect(chorus.router.navigate).toHaveBeenCalledWith(this.result.showUrl());
                        });

                        it("no longer scopes to the workspace", function() {
                            expect(this.view.search.get("workspaceId")).toBeUndefined();
                        });
                    });
                });

                context("has no results at all", function() {
                    beforeEach(function() {
                        var collection = rspecFixtures.userSet([], {total: 0});
                        collection.pagination = { records: 0 };
                        this.view = new chorus.views.SearchResultList({
                            collection: collection,
                            entityType: "user"
                        });

                        this.view.render();
                    });

                    it("does not show the bar or the list", function() {
                        expect($(this.view.el).html().trim()).toBe("");
                    });
                });
            });
        });

        context("filtered search results", function() {
            beforeEach(function() {
                spyOn(this.result, 'isPaginated').andReturn(true);
                this.view.render();
            });

            context("when it's outside of workspace context", function() {
                it("does not display a header", function() {
                    expect(this.view.$(".search_result_header")).not.toExist();
                });
            });

            context("when it's inside of workspace context", function() {
                beforeEach(function() {
                    spyOn(this.result, 'workspace').andReturn(rspecFixtures.workspace());
                    this.view.render();
                });

                it("displays a header", function() {
                    expect(this.view.$(".search_result_header")).toExist();
                });
            });
        });
    });
});
