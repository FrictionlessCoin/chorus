describe("chorus.views.SearchDataset", function() {
    beforeEach(function() {
        this.result = fixtures.searchResult();
        this.result.set({query: "foo"});
        this.model = this.result.datasets().models[0];
        this.view = new chorus.views.SearchDataset({model: this.model});
        this.view.render();
    });

    describe("the 'found in workspaces' section", function() {
        beforeEach(function() {
            this.model.set({workspaces: [
                {
                    id: 10000,
                    name: "Foo"
                },
                {
                    id: 10010,
                    name: "Bar"
                },
                {
                    id: 10011,
                    name: "Baz"
                }
            ]});
            this.fakeQtip = stubQtip();
            this.view.render();
        });

        it("should display a link to the first workspace", function() {
            expect(this.view.$(".location .found_in")).toContainTranslation("workspaces_used_in.body.other", {
                workspaceLink: "Foo",
                otherWorkspacesMenu: "2 other workspaces"
            });
        });

        it("should attach an instance to the database and instance links", function() {
            expect(this.view.$("a.instance, a.database").data("instance")).toBe(this.model.get("instance"));
        });
    });

    context("when the search results include a chorus view", function() {
        beforeEach(function() {
            this.model = fixtures.searchResultChorusView({ workspace: { name: "Chorus View Thing" }, type: "CHORUS_VIEW" });
            this.view = new chorus.views.SearchDataset({model: this.model});
            this.view.render();
        });

        it("should display a link to the single workspace", function() {
            expect(this.view.$(".location .found_in")).toContainTranslation("workspaces_used_in.body.one", {
                workspaceLink: "Chorus View Thing"
            });
        });

        it("links to the correct dataset url", function() {
            expect(this.view.$('.name').attr('href')).toMatch(/workspace/);
        })
    });

    context("when there are column comments", function() {
        beforeEach(function() {
            this.model.set({'columnDescriptions': [{highlightedAttributes: {body: ['comment 1']}}, {highlightedAttributes: {body: ['comment 2']}}]});
            this.view.render();
        });

        it("displays the column comments", function() {
            expect(this.view.$('.comment .comment_type').eq(0)).toContainText('Column Comment:');
            expect(this.view.$('.comment .comment_content').eq(0)).toContainText('comment 1');
            expect(this.view.$('.comment .comment_content').eq(1)).toContainText('comment 2');
        });
    });

    // TODO: Fix these when we have the new structure for column and table comments on a dataset. [#37076621]
    xcontext("when there is a table comment", function() {
        beforeEach(function() {
            this.model.get('highlightedAttributes').description = ['comment 1'];
            this.view.render();
        });

        it("displays the table comment", function() {
            expect(this.view.$('.comment .comment_content')).toContainText('comment 1');
        });
    });

    it("displays the items name", function() {
        expect(this.view.$(".name")).toContainText(this.model.get("objectName"));
    });

    it("displays a link to the item", function() {
        expect(this.view.$(".name")).toHaveAttr("href", this.model.showUrl());
    });

    it("displays an icon for the item", function() {
        var img = this.view.$(".icon");
        expect(img).toExist();
        expect(img).toHaveAttr("src", this.model.iconUrl())
        expect(img).toHaveAttr("title", Handlebars.helpers.humanizedDatasetType(this.model.attributes))
    });
});
