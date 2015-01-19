describe("chorus.dialogs.VisualizationNotesNew", function() {
    describe("when in workspace context ( in Data tab )", function() {
        beforeEach(function() {
            spyOn(chorus.dialogs.MemoNew.prototype, "modelSaved").andCallThrough();

            this.dialog = new chorus.dialogs.VisualizationNotesNew({
                entityId: "1",
                entityName: "my dataset",
                workspaceId: "22",
                entityType: "dataset",
                allowWorkspaceAttachments: "true",
                pageModel: backboneFixtures.workspaceDataset.datasetTable(),
                attachVisualization: {
                    fileName: "hello-frequency.png",
                    svgData: "<svg/>"
                }
            });
            $('#jasmine_content').append(this.dialog.el);
            this.dialog.render();
        });

        describe("#setup", function() {
            it("creates the correct model", function() {
                expect(this.dialog.model).toBeA(chorus.models.Note);
            });

            it("sets the correct properties on the model", function() {
                expect(this.dialog.model.get("entityId")).toBe("1");
                expect(this.dialog.model.get("entityType")).toBe("dataset");
            });
        });

        it("sub-classes NoteNewDialog", function() {
            expect(this.dialog).toBeA(chorus.dialogs.MemoNew);
        });

        describe("#render", function() {
            it("has the right placeholder", function() {
                expect(this.dialog.$("textarea[name=body]").attr("placeholder")).toBe(t("notes.placeholder", {noteSubject: "dataset"}));
            });

            it("display the chart image and chart fileName", function() {
                expect(this.dialog.$(".options_area")).not.toHaveClass("hidden");
                expect(this.dialog.$(".options_area .row.file_details.visualization .name")).toHaveText("hello-frequency.png");
                expect(this.dialog.$(".icon").attr("src")).toBe("images/workfiles/icon/img.png");
                expect(this.dialog.$("a.removeWidget")).toHaveClass("hidden");
            });
        });

        describe("#save", function() {
            beforeEach(function() {
                this.dialog.$("textarea[name=body]").val("The body of a note");
                this.dialog.$("form").trigger("submit");
                spyOnEvent(this.dialog.pageModel, "invalidated");
                this.server.completeCreateFor(this.dialog.model, _.extend({id: 2}, this.dialog.model.attributes));
            });

            it("calls super#modelSaved", function() {
                expect(chorus.dialogs.MemoNew.prototype.modelSaved).toHaveBeenCalled();
            });

            it("saves the visualization chart as an attachment to the note", function() {
                expect(this.server.lastCreate().url).toEqual("/notes/2/attachments");
                expect(this.server.lastCreate().json()).toEqual({ file_name : 'hello-frequency.png', svg_data : '<svg/>' });
            });

            describe("after the v11n attachment has been saved", function() {
                beforeEach(function() {
                    spyOn(chorus, "toast");
                    this.server.lastCreate().succeed();
                });

                it("triggers invalidated on the dataset (to refresh the dataset's activity stream) after the v11n attachment has been saved", function() {
                    expect("invalidated").toHaveBeenTriggeredOn(this.dialog.pageModel);
                });

                it("pops toast", function() {
                    expect(chorus.toast).toHaveBeenCalledWith("dataset.visualization.toast.note_from_chart", {
                        datasetName: 'my dataset'
                    });
                });
            });

        });
    });
});
