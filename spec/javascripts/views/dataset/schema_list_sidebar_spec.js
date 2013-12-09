describe("chorus.views.SchemaListSidebar", function() {
    beforeEach(function() {
        this.view = new chorus.views.SchemaListSidebar();

        this.schema = backboneFixtures.schema();
        chorus.PageEvents.trigger("schema:selected", this.schema);
    });

    it("should display the schema name", function() {
        expect(this.view.$(".name")).toContainText(this.schema.get("name"));
    });

    it("displays the new name when a new schema is selected", function() {
        var schema = backboneFixtures.schema();
        chorus.PageEvents.trigger("schema:selected", schema);
        expect(this.view.$(".name")).toContainText(schema.get("name"));
    });

    it("displays nothing when a schema is deselected", function() {
        chorus.PageEvents.trigger("schema:deselected");
        expect(this.view.$(".info")).not.toExist();
    });

    describe("the schema type", function() {
        it("presents correctly for Oracle schemas", function() {
            this.schema.set("entityType", "oracle_schema");
            chorus.PageEvents.trigger("schema:selected", this.schema);
            expect(this.view.$(".details")).toContainTranslation("schema_list.sidebar.type.oracle_schema");
        });

        it("presents correctly for GPDB schemas", function() {
            this.schema.set("entityType", "gpdb_schema");
            chorus.PageEvents.trigger("schema:selected", this.schema);
            expect(this.view.$(".details")).toContainTranslation("schema_list.sidebar.type.gpdb_schema");
        });

        it("presents correctly for JDBC schemas", function() {
            this.schema.set("entityType", "jdbc_schema");
            chorus.PageEvents.trigger("schema:selected", this.schema);
            expect(this.view.$(".details")).toContainTranslation("schema_list.sidebar.type.jdbc_schema");
        });
    });
});