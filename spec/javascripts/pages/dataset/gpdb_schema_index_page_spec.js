describe("chorus.pages.GpdbSchemaIndexPage", function() {
    beforeEach(function() {
        this.database = backboneFixtures.database({id: "5678", name: "Foo", dataSource: {id: "1234", name: "Foo"}});
        this.page = new chorus.pages.GpdbSchemaIndexPage("5678");
        this.page.render();
    });

    it("includes the DataSourceCredentials mixin", function() {
        expect(this.page.dependentResourceForbidden).toBe(chorus.Mixins.DataSourceCredentials.page.dependentResourceForbidden);
    });

    it("has a helpId", function() {
        expect(this.page.helpId).toBe("instances");
    });

    it("fetches the database", function() {
        expect(this.page.database).toHaveBeenFetched();
    });

    it("fetches the schema set with the right database id", function() {
        expect(this.page.collection.attributes.databaseId).toBe("5678");
        expect(this.page.collection).toHaveBeenFetched();
    });

    describe("when all of the fetches complete", function() {
        beforeEach(function() {
            this.server.completeFetchFor(this.database);
            this.server.completeFetchFor(this.page.collection, [
                backboneFixtures.schema({name: "bar"}), backboneFixtures.schema({name: "foo"})
            ]);
        });

        it("should have title in the mainContentList", function() {
            expect(this.page.mainContent.contentHeader.$("h1")).toContainText("Foo");
        });

        it('should have the correct data source icon in the header ', function() {
            expect(this.page.mainContent.contentHeader.$("img")).toHaveAttr("src", "/images/data_sources/greenplum_database.png");
        });

        it("should have set up search correctly", function() {
            expect(this.page.$(".list_content_details .count")).toContainTranslation("entity.name.Schema", {count: 2});
            expect(this.page.$("input.search")).toHaveAttr("placeholder", t("schema.search_placeholder"));

            this.page.$("input.search").val("bar").trigger("keyup");

            expect(this.page.$(".item_wrapper:eq(1)")).toHaveClass("hidden");
            expect(this.page.$(".list_content_details .count")).toContainTranslation("entity.name.Schema", {count: 1});
            expect(this.page.mainContent.options.search.eventName).toBe("schema:search");
        });

        it("should have the correct breadcrumbs", function() {
            expect(this.page.$(".breadcrumb").length).toBe(4);

            expect(this.page.$(".breadcrumb:eq(0) a").attr("href")).toBe("#/");
            expect(this.page.$(".breadcrumb:eq(0)")).toContainTranslation("breadcrumbs.home");

            expect(this.page.$(".breadcrumb:eq(1) a").attr("href")).toBe("#/data_sources");
            expect(this.page.$(".breadcrumb:eq(1)")).toContainTranslation("breadcrumbs.data_sources");

            expect(this.page.$(".breadcrumb:eq(2) a").attr("href")).toBe(this.database.dataSource().showUrl());
            expect(this.page.$(".breadcrumb:eq(2)")).toContainText(this.database.dataSource().name());

            expect(this.page.$(".breadcrumb:eq(3)")).toContainText("Foo");
        });

        it("has a sidebar", function() {
            expect(this.page.sidebar).toBeA(chorus.views.SchemaListSidebar);
            expect(this.page.$(this.page.sidebar.el)).toExist();
        });
    });
});
