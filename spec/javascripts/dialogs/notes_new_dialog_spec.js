describe("chorus.dialogs.NotesNewDialog", function() {
    beforeEach(function() {
        this.dialog = new chorus.dialogs.NotesNew({
            entityType: "data_source",
            entityId: 1,
            pageModel: new chorus.models.GpdbDataSource()
        });
        $('#jasmine_content').append(this.dialog.el);
        this.dialog.render();
    });

    describe("#setup", function() {
        it("creates the correct model", function() {
            expect(this.dialog.model).toBeA(chorus.models.Note);
        });

        it("sets the correct properties on the model", function() {
            expect(this.dialog.model.get("entityType")).toBe("data_source");
            expect(this.dialog.model.get("entityId")).toBe(1);
        });

        it("stores the correct pageModel", function() {
            expect(this.dialog.pageModel).not.toBeUndefined();
        });

        context("when a workspaceId option is passed", function() {
            it("sets that attribute on the note model", function() {
                this.dialog = new chorus.dialogs.NotesNew({
                    entityType: "data_source",
                    entityId: 1,
                    workspaceId: 45,
                    pageModel: new chorus.models.GpdbDataSource()
                });

                expect(this.dialog.model.get("workspaceId")).toBe(45);
            });
        });
    });

    describe("#render", function() {
        it("has the right title", function() {
            expect(this.dialog.$(".dialog_header h1")).toContainTranslation("notes.new_dialog.title");
        });

        it("has the right placeholder", function() {
            expect(this.dialog.$("textarea[name=body]").attr("placeholder")).toBe(t("notes.placeholder", {noteSubject: "data_source"}));
        });

        it("has the right button text", function() {
            expect(this.dialog.$("button.submit").text().trim()).toMatchTranslation("notes.button.create");
        });

        context("when a displayEntityType is available", function() {
            beforeEach(function() {
                this.dialog = new chorus.dialogs.NotesNew({
                    entityType: "data_source",
                    entityId: 1,
                    displayEntityType: 'foo',
                    pageModel: new chorus.models.GpdbDataSource()
                });
                $('#jasmine_content').append(this.dialog.el);
                this.dialog.render();
            });

            it("shows the displayEntityType in the placeholder", function() {
                expect(this.dialog.$("textarea[name=body]").attr("placeholder")).toBe(t("notes.placeholder", {noteSubject: "foo"}));
            });
        });
    });
});
