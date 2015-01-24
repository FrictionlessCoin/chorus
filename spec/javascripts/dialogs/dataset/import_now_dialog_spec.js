jasmine.sharedExamples.importIntoNewTableIsSelected = function() {
    it("should disable the destination dataset picker link", function() {
        expect(this.dialog.$(".existing_table a.dataset_picked")).toHaveClass('hidden');
        expect(this.dialog.$(".existing_table span.dataset_picked")).not.toHaveClass('hidden');
    });

    it("should disable the truncate option", function() {
        expect(this.dialog.$(".truncate")).toBeDisabled();
    });
};

describe("chorus.dialogs.ImportNow", function() {
    context('importing into a workspace', function() {
        beforeEach(function() {
            this.dataset = backboneFixtures.workspaceDataset.datasetTable({workspace: {id: 123}});
            this.dialog = new chorus.dialogs.ImportNow({
                dataset: this.dataset
            });
        });

        it('creates a WorkspaceImport model', function(){
            expect(this.dialog.model).toBeA(chorus.models.WorkspaceImport);
        });

        context("without an existing scheduled import", function() {
            beforeEach(function() {
                this.dialog.render();
            });

            it("should initialize its model with the correct datasetId and workspaceId", function() {
                expect(this.dialog.model.get("datasetId")).toBe(this.dataset.get("id"));
                expect(this.dialog.model.get("workspaceId")).toBe(this.dataset.get("workspace").id);
            });

            describe("the initial state", function() {
                itBehavesLike.importIntoNewTableIsSelected();

                it("should have the correct title", function() {
                    expect(this.dialog.title).toMatchTranslation("import.title");
                });

                it("should display the import destination", function() {
                    expect(this.dialog.$(".destination")).toContainTranslation("import.destination", {canonicalName: this.dataset.workspace().sandbox().schema().canonicalName()});
                });

                describe("the new table section", function() {
                    it("should have an 'Import into new table' radio button", function() {
                        expect(this.dialog.$(".new_table label")).toContainTranslation("import.new_table");
                    });

                    it("selects 'import into new table' by default", function() {
                        expect(this.dialog.$(".new_table input:radio")).toBeChecked();
                    });

                    it("should have a text entry for new table name", function() {
                        expect(this.dialog.$(".new_table .name")).toBeEnabled();
                    });
                });

                describe("the existing table section", function() {
                    it("should have an 'Import into an existing table' radio button", function() {
                        expect(this.dialog.$(".existing_table label")).toContainTranslation("import.existing_table");
                    });
                });

                describe('options', function() {
                    it("should have a 'Limit Rows' checkbox", function() {
                        expect(this.dialog.$(".limit label")).toContainTranslation("import.limit_rows");
                        expect(this.dialog.$(".limit input:checkbox")).not.toBeChecked();
                    });

                    it("should have a disabled textfield for the 'Limit Rows' value with the appropriate length", function() {
                        expect(this.dialog.$(".limit input:text")).toBeDisabled();
                        expect(this.dialog.$(".limit input:text").attr("maxlength")).toBe("10");
                    });
                });

                it("should have a disabled 'Begin Import' button", function() {
                    expect(this.dialog.$("button.submit")).toContainTranslation("import.begin");
                    expect(this.dialog.$("button.submit")).toBeDisabled();
                });
            });

            context("when 'Import into Existing Table' is selected", function() {
                beforeEach(function() {
                    this.dialog.$(".new_table input:radio").prop("checked", false);
                    this.dialog.$(".existing_table input:radio").prop("checked", true).change();
                });

                it("should disable the submit button by default", function() {
                    expect(this.dialog.$("button.submit")).toBeDisabled();
                });

                it("should enable the truncate option", function() {
                    expect(this.dialog.$(".truncate")).toBeEnabled();
                });

                it("should enable the 'select destination table' link", function() {
                    expect(this.dialog.$(".existing_table a.dataset_picked")).not.toHaveClass("hidden");
                    expect(this.dialog.$(".existing_table span.dataset_picked")).toHaveClass("hidden");
                });

                it("should have a link to the dataset picker dialog", function() {
                    expect(this.dialog.$(".existing_table a.dataset_picked")).toContainTranslation("dataset.import.select_destination");
                });

                context("after clicking the dataset picker link", function() {
                    beforeEach(function() {
                        this.modalStub = stubModals();
                        spyOn(chorus.Modal.prototype, 'launchSubModal').andCallThrough();
                        spyOn(this.dialog, "datasetsChosen").andCallThrough();
                        this.dialog.$(".existing_table a.dataset_picked").click();
                    });

                    it("should launch the dataset picker dialog", function() {
                        expect(chorus.Modal.prototype.launchSubModal).toHaveBeenCalled();
                    });

                    it("uses the workspace sandbox tables", function() {
                        var collection = this.modalStub.lastModal().collection;
                        expect(collection).toEqual(this.dataset.workspace().sandboxTables({allImportDestinations: true}));
                        expect(collection.attributes.allImportDestinations).toBeTruthy();
                    });

                    context("after selecting a dataset", function() {
                        beforeEach(function() {
                            var datasets = [backboneFixtures.workspaceDataset.datasetTable({ objectName: "myDatasetWithAReallyReallyLongName" })];
                            chorus.modal.trigger("datasets:selected", datasets);
                        });

                        it("should show the selected dataset in the link, ellipsized", function() {
                            expect(this.dialog.datasetsChosen).toHaveBeenCalled();
                            expect(this.dialog.$(".existing_table a.dataset_picked")).toContainText("myDatasetWithAReally…");
                        });

                        it("stores the un-ellipsized dataset name on the dialog", function() {
                            expect(this.dialog.selectedDatasetName).toBe("myDatasetWithAReallyReallyLongName");
                        });

                        it("should re-enable the submit button", function() {
                            expect(this.dialog.$("button.submit")).toBeEnabled();
                        });

                        describe("clicking the 'import' button", function() {
                            beforeEach(function() {
                                this.dialog.$("button.submit").click();
                            });

                            it("sends the correct dataset name", function() {
                                expect(this.server.lastCreate().json()["dataset_import"]["to_table"]).toBe("myDatasetWithAReallyReallyLongName");
                            });
                        });

                        context("and then 'import into new table is checked", function() {
                            beforeEach(function() {
                                this.dialog.$(".existing_table input:radio").prop("checked", false);
                                this.dialog.$(".new_table input:radio").prop("checked", true).change();
                            });

                            it("still shows the selected table name in the existing table section", function() {
                                expect(this.dialog.$(".existing_table span.dataset_picked")).not.toHaveClass('hidden');
                            });
                        });
                    });
                });

                context("and the form is submitted", function() {
                    beforeEach(function() {
                        this.dialog.$(".truncate").prop("checked", true).change();
                        this.dialog.$(".existing_table a.dataset_picked").text("a");
                        this.dialog.onInputFieldChanged();

                        this.dialog.$("button.submit").click();
                    });

                    it("should save the model", function() {
                        expect(this.server.lastCreateFor(this.dialog.model)).toBeDefined();
                        expect(this.server.lastCreateFor(this.dialog.model).json()['dataset_import']['truncate']).toBe('true');
                        expect(this.server.lastCreateFor(this.dialog.model).json()['dataset_import']['new_table']).toBe('false');
                    });
                });
            });

            context("when 'Import into new table is selected", function() {
                beforeEach(function() {
                    this.dialog.$(".new_table input:radio").prop("checked", true).change();
                    this.dialog.$(".existing_table input:radio").prop("checked", false).change();
                });

                itBehavesLike.importIntoNewTableIsSelected();

                context("when a new table name is specified", function() {
                    beforeEach(function() {
                        this.dialog.$(".new_table input.name").val("good_table_name").trigger("keyup");
                    });

                    it("enables the submit button", function() {
                        expect(this.dialog.$("button.submit")).toBeEnabled();
                    });

                    context("when the 'limit rows' checkbox is checked", function() {
                        beforeEach(function() {
                            this.dialog.$(".limit input:checkbox").prop("checked", true).change();
                        });

                        it("should enable the limit text-input", function() {
                            expect(this.dialog.$(".limit input:text")).toBeEnabled();
                        });

                        context("when a valid row limit is entered", function() {
                            beforeEach(function() {
                                this.dialog.$(".limit input:text").val("345").trigger("keyup");
                            });

                            it("enables the submit button", function() {
                                expect(this.dialog.$("button.submit")).toBeEnabled();
                            });
                        });
                    });

                    context("when the form is submitted", function() {
                        beforeEach(function() {
                            this.dialog.$("button.submit").click();
                        });

                        it("saves the model", function() {
                            expect(this.server.lastCreateFor(this.dialog.model)).toBeDefined();
                            expect(this.server.lastCreateFor(this.dialog.model).json()['dataset_import']['truncate']).toBe("false");
                            expect(this.server.lastCreateFor(this.dialog.model).json()['dataset_import']['new_table']).toBe("true");
                            expect(this.server.lastCreateFor(this.dialog.model).json()['dataset_import']['to_table']).toBe("good_table_name");
                        });

                        it("should put the submit button in the loading state", function() {
                            expect(this.dialog.$("button.submit").isLoading()).toBeTruthy();
                            expect(this.dialog.$("button.submit")).toContainTranslation("import.importing");
                        });

                        context("and the save is successful", function() {
                            beforeEach(function() {
                                spyOn(chorus, "toast");
                                spyOn(this.dialog, "closeModal");
                                this.server.completeCreateFor(this.dialog.model);
                            });

                            it("should display a toast", function() {
                                expect(chorus.toast).toHaveBeenCalledWith("import.success");
                            });

                            it("should close the dialog", function() {
                                expect(this.dialog.closeModal).toHaveBeenCalled();
                            });

                        });

                        context("and the save is not successful", function() {
                            beforeEach(function() {
                                this.server.lastCreate().failUnprocessableEntity();
                            });

                            it("should not display the loading spinner", function() {
                                expect(this.dialog.$("button.submit").isLoading()).toBeFalsy();
                            });
                        });
                    });
                });
            });
        });
    });

    describe("importing into a schema", function() {
        beforeEach(function() {
            this.dataset = backboneFixtures.oracleDataset();
            this.dialog = new chorus.dialogs.ImportNow({
                dataset: this.dataset
            });
            this.dialog.render();
            $("#jasmine_content").append(this.dialog.el);
        });

        it("asks the server whether or not the columns have supported data types", function() {
            expect(this.server.lastFetch().url).toBe("/datasets/" + this.dataset.id + "/importability");
        });

        context("when dataset importability has not yet been fetched", function() {
            it("shows a loading spinner", function() {
                expect(this.dialog.$('.dialog_content').isLoading()).toBe(true);
            });
        });

        context("when the server responds that the data types are invalid", function(){
            beforeEach(function() {
                spyOn(this.dialog, "closeModal");
                var expectedResponse = backboneFixtures.datasetImportabilityForUnimportableDataset({
                    invalidColumns: ["foo", "bar"]
                });
                var model = new chorus.models.DatasetImportability({
                    datasetId: this.dataset.id
                });
                this.server.completeFetchFor(model, expectedResponse);
            });

            it("closes the import now dialog", function(){
                expect(this.dialog.closeModal).toHaveBeenCalled();
            });

            it("opens the dataset not importable dialog", function(){
                expect(chorus.modal).toBeA(chorus.alerts.DatasetNotImportable);
            });
        });

        context("when the server responds that the data types are valid", function () {
            beforeEach(function() {
                var expectedResponse = backboneFixtures.datasetImportability();
                var model = new chorus.models.DatasetImportability({
                    datasetId: this.dataset.id
                });
                this.server.completeFetchFor(model, expectedResponse);
            });

            it('creates a SchemaImport model', function(){
                expect(this.dialog.model).toBeA(chorus.models.SchemaImport);
            });

            it("all options are hidden until a schema is selected", function() {
                expect(this.dialog.$("input:radio")).toBeHidden();
                expect(this.dialog.$("input:checkbox")).toBeHidden();
            });

            it("the submit button remains disabled when a table name is provided", function() {
                expect(this.dialog.$("button.submit")).toBeDisabled();
                this.dialog.$(".new_table input.name").val("good_table_name").trigger("keyup");
                expect(this.dialog.$("button.submit")).toBeDisabled();
            });

            describe("when the select schema link is clicked", function() {
                beforeEach(function() {
                    this.modalSpy = stubModals();
                    this.dialog.$("a.select_schema").click();
                });

                it("displays a schema picker dialog", function() {
                    expect(this.modalSpy.lastModal()).toBeA(chorus.dialogs.SchemaPicker);
                });
            });

            context("when a schema has been selected", function() {
                beforeEach(function() {
                    this.schema = backboneFixtures.schema({id: 456, name: "ThisIsAReallyLongSchemaNameForPeopleThatLikeVerbosity"});
                    this.modalSpy = stubModals();
                    this.dialog.$("a.select_schema").click();
                    this.modalSpy.lastModal().trigger("schema:selected", this.schema);
                });

                it("sets the dialog's schema", function() {
                    expect(this.dialog.schema).toBe(this.schema);
                });

                it("displays the truncated schema", function() {
                    expect(this.dialog.$(".destination")).toContainText(_.truncate(this.schema.canonicalName(), 40));
                });

                it("sets the schema selection's title attribute to the full schema path", function() {
                    expect(this.dialog.$(".selection")).toHaveAttr("title", this.schema.canonicalName());
                });

                it ("hides the select destination schema button", function() {
                    expect(this.dialog.$(".select_schema")).toHaveClass("hidden");
                });

                describe("change schema link", function() {
                    it ("shows the change schema link", function() {
                        expect(this.dialog.$(".change_schema")).not.toHaveClass("hidden");
                        expect(this.dialog.$(".change_schema")).toContainTranslation("actions.change");
                    });

                    it ("launches the Schema Picker dialog", function() {
                        this.modalSpy.reset();
                        this.dialog.$("a.change_schema").click();
                        expect(this.modalSpy.lastModal()).toBeA(chorus.dialogs.SchemaPicker);
                    });
                });

                it("enables the import target options", function() {
                    expect(this.dialog.$(".options")).not.toHaveClass('hidden');
                });

                it("shows the submit button when a table name is entered", function() {
                    expect(this.dialog.$("button.submit")).toBeDisabled();
                    this.dialog.$(".new_table input.name").val("good_table_name").trigger("keyup");
                    expect(this.dialog.$("button.submit")).toBeEnabled();
                });

                context("when 'Import into Existing Table' is checked", function() {
                    beforeEach(function() {
                        this.dialog.$(".new_table input:radio").prop("checked", false);
                        this.dialog.$(".existing_table input:radio").prop("checked", true).change();
                    });

                    it("should enable the 'select destination table' link", function() {
                        expect(this.dialog.$(".existing_table a.dataset_picked")).not.toHaveClass("hidden");
                        expect(this.dialog.$(".existing_table span.dataset_picked")).toHaveClass("hidden");
                    });

                    context("when the dataset picker link is clicked", function() {
                        beforeEach(function() {
                            this.dialog.$(".existing_table a.dataset_picked").click();
                        });

                        it("should have a link to the dataset picker dialog", function() {
                            expect(this.dialog.$(".existing_table a.dataset_picked")).toContainTranslation("dataset.import.select_destination");
                        });

                        it("passes a collection of datasets in the selected schema", function() {
                            var collection = chorus.modal.options.collection;
                            expect(collection).toBeA(chorus.collections.SchemaDatasetSet);
                            expect(collection.attributes.schemaId).toEqual(456);
                        });
                    });
                });

                context("when the form is submitted", function() {
                    beforeEach(function() {
                        this.dialog.$(".new_table input.name").val("good_table_name").trigger("keyup");
                        this.modalSpy.lastModal().trigger("schema:selected", this.schema);
                        this.dialog.$("button.submit").click();
                    });

                    it("saves the model", function() {
                        expect(this.server.lastCreateFor(this.dialog.model)).toBeDefined();
                    });
                });
            });
        });
    });
});
