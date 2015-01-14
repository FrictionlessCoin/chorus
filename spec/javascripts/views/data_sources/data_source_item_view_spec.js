describe("chorus.views.DataSourceItem", function() {
    beforeEach(function() {
        this.sharedAttributes = {
            name: "data_source_number_one",
            description: "I'm a data source"
        };
    });

    describe("when the model is a data source", function() {
        beforeEach(function() {
            this.model = backboneFixtures.gpdbDataSource(_.extend(this.sharedAttributes, {
                online: true
            }));
            this.view = new chorus.views.DataSourceItem({model: this.model});
            this.view.render();
        });

        it("shows the name", function() {
            expect(this.view.$("a.name")).toHaveText("data_source_number_one");
        });

        it("displays the state icon", function() {
            expect(this.view.$("img.state").attr("src")).toBe("/images/data_sources/green.svg");
            expect(this.view.$("img.state").attr("title")).toContainTranslation("data_sources.state.online");
            this.model.set("online", false);
            this.view.render();
            expect(this.view.$("img.state").attr("src")).toBe("/images/data_sources/yellow.svg");
            expect(this.view.$("img.state").attr("title")).toContainTranslation("data_sources.state.offline");
        });

        it("displays the correct provider icon", function() {
            expect(this.view.$("img.provider").attr("src")).toBe("/images/data_sources/icon_gpdb_data_source.png");
        });

        it("includes the correct showUrl", function() {
            expect(this.view.$("a.name")).toHaveHref(this.model.showUrl());
        });

        it("shows the description", function() {
            expect(this.view.$(".description")).toContainText("I'm a data source");
        });

        context("when the dataset has tags", function () {
            beforeEach(function () {
                this.model.tags().reset([{name: "tag1"}, {name: "tag2"}]);
                this.view.render();
            });

            it("shows a list of tags", function () {
                expect(this.view.$('.item_tag_list')).toContainTranslation("tag_list.title");
                expect(this.view.$('.item_tag_list')).toContainText("tag1 tag2");
            });
        });
    });

    describe("when the model is a gnip data source", function() {
        beforeEach(function() {
            this.model = backboneFixtures.gnipDataSource(this.sharedAttributes);
            this.view = new chorus.views.DataSourceItem({model: this.model});
            this.view.render();
        });

        it("displays the correct provider icon", function() {
            expect(this.view.$("img.provider").attr("src")).toBe("/images/data_sources/icon_gnip_data_source.png");
        });

        it("displays the state icon", function() {
            expect(this.view.$("img.state").attr("src")).toBe("/images/data_sources/green.svg");
            expect(this.view.$("img.state").attr("title")).toContainTranslation("data_sources.state.online");
        });
    });

    describe("when the model is a hdfs data source", function() {
        beforeEach(function() {
            this.model = backboneFixtures.hdfsDataSource(this.sharedAttributes);
            this.view = new chorus.views.DataSourceItem({model: this.model});
            this.view.render();
        });

        it("displays the correct provider icon", function() {
            expect(this.view.$("img.provider").attr("src")).toBe("/images/data_sources/icon_hdfs_data_source.png");
        });

        it("displays the state icon", function() {
            expect(this.view.$("img.state").attr("src")).toBe("/images/data_sources/green.svg");
            expect(this.view.$("img.state").attr("title")).toContainTranslation("data_sources.state.online");
        });
    });
});
