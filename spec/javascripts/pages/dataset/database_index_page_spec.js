describe("chorus.pages.DatabaseIndexPage", function() {
    beforeEach(function() {
        this.dataSource = backboneFixtures.gpdbDataSource({id: "1234", name: "Data Source Name"});
        this.page = new chorus.pages.DatabaseIndexPage("1234");
        this.page.render();
    });

    it("includes the data source credentials mixin", function() {
        expect(this.page.dependentResourceForbidden).toBe(
            chorus.Mixins.DataSourceCredentials.page.dependentResourceForbidden
        );
    });

    it("has a helpId", function() {
        expect(this.page.helpId).toBe("instances");
    });

    it("does not show a title before the fetch completes", function() {
        expect(this.page.$(".content_header h1").text()).toBe("");
    });

    it('fetches the data source', function() {
        expect(this.page.dataSource).toHaveBeenFetched();
    });

    it('fetches the databases for that data source', function() {
        expect(this.page.collection).toHaveBeenFetched();
    });

    describe("before the fetches complete", function() {
        it("displays a loading section", function() {
            expect(this.page.$(".loading_section")).toExist();
        });
    });

    describe("when all of the fetches complete", function() {
        beforeEach(function() {
            this.server.completeFetchFor(this.dataSource);
            this.server.completeFetchFor(this.page.collection, [backboneFixtures.database({name: "bar"}), backboneFixtures.database({name: "foo"})]);
        });

        it("should have title in the mainContentList", function() {
            expect(this.page.mainContent.contentHeader.$("h1")).toContainText(this.dataSource.get("name"));
        });

        it('should have the correct data source icon in the header ', function() {
            expect(this.page.mainContent.contentHeader.$("img")).toHaveAttr("src", this.dataSource.providerIconUrl());
        });

        it("should have the correct breadcrumbs", function() {
            expect(this.page.$(".breadcrumb").length).toBe(3);

            expect(this.page.$(".breadcrumb:eq(0) a").attr("href")).toBe("#/");
            expect(this.page.$(".breadcrumb:eq(0)")).toContainTranslation("breadcrumbs.home");

            expect(this.page.$(".breadcrumb:eq(1) a").attr("href")).toBe("#/data_sources");
            expect(this.page.$(".breadcrumb:eq(1)")).toContainTranslation("breadcrumbs.data_sources");

            expect(this.page.$(".breadcrumb:eq(2)")).toContainText(this.dataSource.get("name"));
        });

        it("should have set up search correctly", function() {
            expect(this.page.$(".list_content_details .count")).toContainTranslation("entity.name.Database", {count: 2});
            expect(this.page.$("input.search")).toHaveAttr("placeholder", t("database.search_placeholder"));

            this.page.$("input.search").val("bar").trigger("keyup");

            expect(this.page.$("li.item_wrapper:eq(1)")).toHaveClass("hidden");
            expect(this.page.$(".list_content_details .count")).toContainTranslation("entity.name.Database", {count: 1});
        });

        it("has a sidebar", function() {
            expect(this.page.sidebar).toBeA(chorus.views.DatabaseListSidebar);
            expect(this.page.$(this.page.sidebar.el)).toExist();
        });
    });

    context('when fetching the collection returns a 403', function(){
        var launchModalSpy;

        beforeEach(function() {
            launchModalSpy = spyOn(chorus.dialogs.DataSourceAccount.prototype, 'launchModal');
            this.server.completeFetchFor(this.dataSource);
            this.server.lastFetchAllFor(this.page.collection).failForbidden(backboneFixtures.invalidCredentialsErrorJson().errors);
        });

        it("launches the DataSourceAccount dialog", function() {
            expect(launchModalSpy).toHaveBeenCalled();
        });
    });
});
