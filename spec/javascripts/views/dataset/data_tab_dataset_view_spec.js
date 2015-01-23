describe("chorus.views.DataTabDataset", function() {
    beforeEach(function() {
        this.dataset = backboneFixtures.dataset({ schema: { name: "schema_name"}, objectName: "1234",  entitySubtype: "SANDBOX_TABLE", objectType: "TABLE" });
        this.view = new chorus.views.DataTabDataset({model: this.dataset});
        this.qtip = stubQtip();
        this.view.render();
        spyOn(chorus.PageEvents, "trigger");
    });

    it("adds the correct data attribute for fullname", function() {
        expect(this.view.$el.data("fullname")).toBe('"schema_name"."1234"');
    });

    it("renders the appropriate icon", function() {
        expect(this.view.$("img:eq(0)")).toHaveAttr("src", "/images/sandbox_table_small.png");
        this.view.model.set("objectType", "VIEW");
        this.view.render();
        expect(this.view.$("img:eq(0)")).toHaveAttr("src", "/images/sandbox_view_small.png");
    });

    it("renders the name of the dataset", function() {
        expect(this.view.$(".name")).toContainText("1234");
    });

    context("when clicking the name link within the li", function() {
        it("toggles the column list", function() {
            this.view.$('.name a').click();
            this.server.completeFetchAllFor(this.dataset.columns(), [
                backboneFixtures.databaseColumn({name: "column_1"})
            ]);
            expect(this.view.$(".data_tab_dataset_column_list")).toContainText("column_1");

            this.view.$('.name a').click();
            expect(this.view.$(".data_tab_dataset_column_list")).not.toContainText("column_1");
        });
    });

    describe("toggling the column list", function() {
        beforeEach(function() {
            this.view.$('.toggle_display').click();
            this.server.completeFetchAllFor(this.dataset.columns(), [
                backboneFixtures.databaseColumn({name: "column_1"})
            ]);
        });

        context("when the list is hidden", function() {
            it("shows the columns", function() {
                expect(this.view.$(".data_tab_dataset_column_list")).toContainText("column_1");
            });

            it("shows the close arrow", function() {
                expect(this.view.$('.toggle_display')).toHaveClass("fa-caret-down");
            });
        });

        context("when the list is shown", function() {
            beforeEach(function () {
                this.view.$('.toggle_display').click();
            });

            it("hides the columns", function() {
                expect(this.view.$(".data_tab_dataset_column_list")).not.toContainText("column_1");
            });

            it("shows the expand arrow", function() {
                expect(this.view.$('.toggle_display')).toHaveClass("fa-caret-right");
            });
        });
    });
});
