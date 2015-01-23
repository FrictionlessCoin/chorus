jasmine.sharedExamples.importIntoNewTableIsSelected = function () {
    it("should disable the destination dataset picker link", function () {
        expect(this.dialog.$(".destination a.dataset_picked")).toHaveClass('hidden');
        expect(this.dialog.$(".destination span.dataset_picked")).not.toHaveClass('hidden');
    });
};

jasmine.sharedExamples.importIntoExistingTableIsSelected = function () {
    it("should enable the destination dataset picker link", function () {
        expect(this.dialog.$(".destination a.dataset_picked")).not.toHaveClass('hidden');
        expect(this.dialog.$(".destination span.dataset_picked")).toHaveClass('hidden');
    });

    it("should enable the truncate option", function () {
        expect(this.dialog.$(".truncate")).toBeEnabled();
    });
};

describe("chorus.dialogs.ConfigureImportSourceDataTask", function () {
    context("when initialized without a model", function () {
        beforeEach(function () {
            this.job = backboneFixtures.job();
            chorus.page = {};
            this.workspace = chorus.page.workspace = this.job.workspace();
            this.dialog = new chorus.dialogs.ConfigureImportSourceDataTask({job: this.job});
            this.dialog.render();
        });

        it('creates a JobTask model', function () {
            expect(this.dialog.model).toBeA(chorus.models.JobTask);
        });

        it("has all the dialog pieces", function () {
            expect(this.dialog.$('.dialog_header h1')).toContainTranslation("create_job_task_dialog.add_title");
            expect(this.dialog.$('button.submit').text()).toMatchTranslation("create_job_task_dialog.add");
            expect(this.dialog.$('button.cancel').text()).toMatchTranslation("actions.cancel");
        });

        it("shows the import section", function () {
            expect(this.dialog.$('.import')).not.toHaveClass('hidden');
        });

        itBehavesLike.importIntoExistingTableIsSelected();

        describe("the source Dataset fieldset zone", function () {
            it("contains a clever 'select Source data' link", function () {
                expect(this.dialog.$(".source a.dataset_picked")).not.toHaveClass("hidden");
                expect(this.dialog.$(".source a.dataset_picked")).toContainTranslation("dataset.import.select_source");
            });

            describe("clicking the dataset picker link", function () {
                beforeEach(function () {
                    this.modalSpy = stubModals();
                    spyOn(chorus.Modal.prototype, 'launchSubModal').andCallThrough();
                    spyOn(this.dialog, "datasetsChosen").andCallThrough();
                    this.dialog.$(".source a.dataset_picked").click();
                });

                itBehavesLike.aDialogLauncher('.source .dataset_picked', chorus.dialogs.DatasetsPicker);

                it("launches the dataset picker dialog as a subModal", function () {
                    expect(chorus.Modal.prototype.launchSubModal).toHaveBeenCalled();
                });

                it("uses the workspace source tables", function () {
                    var collection = this.modalSpy.lastModal().collection;
                    expect(collection).toEqual(this.workspace.importSourceDatasets());
                });

                context("after selecting a dataset", function () {
                    beforeEach(function () {
                        var datasets = [backboneFixtures.workspaceDataset.datasetTable({ objectName: "myDatasetWithAReallyReallyLongName" })];
                        chorus.modal.trigger("datasets:selected", datasets, '.source');
                    });

                    it("should show the selected dataset in the link, ellipsized", function () {
                        expect(this.dialog.datasetsChosen).toHaveBeenCalled();
                        expect(this.dialog.$(".source a.dataset_picked")).toContainText("myDatasetWithAReally…");
                    });
                });
            });
        });

        describe("the new table section", function () {
            it("should have an 'Import into new table' radio button", function () {
                expect(this.dialog.$(".new_table label")).toContainTranslation("import.new_table");
            });

            it("should have a text entry for new table name", function () {
                expect(this.dialog.$("input.new_table_name")).toBeDisabled();
            });
        });

        describe("the existing table section ", function () {
            it("is enabled by default", function () {
                expect(this.dialog.$(".choose_table input:radio")).toBeChecked();
            });

            it("has an 'Import into an existing table' radio button", function () {
                expect(this.dialog.$(".destination label")).toContainTranslation("import.existing_table");
            });

            context("when 'Import into Existing Table' is selected", function () {
                beforeEach(function () {
                    this.dialog.$(".destination .new_table input:radio").prop("checked", false);
                    this.dialog.$(".destination .choose_table input:radio").prop("checked", true).change();
                });

                it("should disable the submit button by default", function () {
                    expect(this.dialog.$("button.submit")).toBeDisabled();
                });

                it("should enable the truncate option", function () {
                    expect(this.dialog.$(".truncate")).toBeEnabled();
                });

                it("should enable the 'select destination table' link", function () {
                    expect(this.dialog.$(".destination a.dataset_picked")).not.toHaveClass("hidden");
                    expect(this.dialog.$(".destination span.dataset_picked")).toHaveClass("hidden");
                });

                it("should have a link to the dataset picker dialog", function () {
                    expect(this.dialog.$(".destination a.dataset_picked")).toContainTranslation("dataset.import.select_destination");
                });

                context("after clicking the dataset picker link", function () {
                    beforeEach(function () {
                        this.modalStub = stubModals();
                        spyOn(chorus.Modal.prototype, 'launchSubModal').andCallThrough();
                        spyOn(this.dialog, "datasetsChosen").andCallThrough();
                        this.dialog.$(".destination a.dataset_picked").click();
                    });

                    it("should launch the dataset picker dialog", function () {
                        expect(chorus.Modal.prototype.launchSubModal).toHaveBeenCalled();
                    });

                    it("uses the workspace sandbox tables", function () {
                        var collection = this.modalStub.lastModal().collection;
                        expect(collection).toEqual(this.workspace.sandboxTables({allImportDestinations: true}));
                        expect(collection.attributes.allImportDestinations).toBeTruthy();
                    });

                    context("after selecting a dataset", function () {
                        beforeEach(function () {
                            this.dataset = backboneFixtures.workspaceDataset.datasetTable({ objectName: "myDatasetWithAReallyReallyLongName" });
                            var datasets = [this.dataset];
                            chorus.modal.trigger("datasets:selected", datasets, '.destination');
                        });

                        it("should show the selected dataset in the link, ellipsized", function () {
                            expect(this.dialog.datasetsChosen).toHaveBeenCalled();
                            expect(this.dialog.$(".destination a.dataset_picked")).toContainText("myDatasetWithAReally…");
                        });

                        it("stores the dataset id on the dialog", function () {
                            expect(this.dialog.selectedDestinationDatasetId).toBe(this.dataset.get("id"));
                        });

                        context("and then 'import into new table is checked", function () {
                            beforeEach(function () {
                                this.dialog.$(".destination input:radio").prop("checked", false);
                                this.dialog.$(".new_table input:radio").prop("checked", true).change();
                            });

                            it("still shows the selected table name in the existing table section", function () {
                                expect(this.dialog.$(".destination span.dataset_picked")).not.toHaveClass('hidden');
                            });
                        });
                    });
                });

                describe("the Submit button", function () {
                    function theSubmitButtonIs(status) {
                        it("the submit button is " + status, function () {
                            if (status === 'disabled') {
                                expect(this.dialog.$("button.submit")).toBeDisabled();
                            } else {
                                expect(this.dialog.$("button.submit")).toBeEnabled();
                            }
                        });
                    }

                    beforeEach(function () {
                        this.modalStub = stubModals();
                        this.dialog.$(".destination .new_table input:radio").prop("checked", false);
                        this.dialog.$(".destination .choose_table input:radio").prop("checked", true).change();
                    });

                    context("when nothing has been selected", function () {
                        theSubmitButtonIs('disabled');
                    });

                    context("when only a source table has been selected", function () {
                        beforeEach(function () {
                            this.dialog.$(".source a.dataset_picked").click();
                            var datasets = [backboneFixtures.workspaceDataset.datasetTable({ objectName: "foo" })];
                            chorus.modal.trigger("datasets:selected", datasets, '.source');
                        });
                        theSubmitButtonIs('disabled');
                    });

                    context("when only a destination table has been selected", function () {
                        beforeEach(function () {
                            this.dialog.$(".destination a.dataset_picked").click();
                            var datasets = [backboneFixtures.workspaceDataset.datasetTable({ objectName: "foo" })];
                            chorus.modal.trigger("datasets:selected", datasets, '.destination');
                        });
                        theSubmitButtonIs('disabled');
                    });

                    context("when a source table has been selected and a new destination table is selected", function () {
                        beforeEach(function () {
                            this.dialog.$(".source a.dataset_picked").click();
                            var sourceDatasets = [backboneFixtures.workspaceDataset.datasetTable({ objectName: "foo" })];
                            chorus.modal.trigger("datasets:selected", sourceDatasets, '.source');

                            this.dialog.$(".destination .new_table input:radio").prop("checked", true).change();
                            this.dialog.$(".destination .choose_table input:radio").prop("checked", false).change();

                            this.dialog.$(".new_table input.new_table_name").val("good_table_name").trigger("keyup");
                        });

                        itBehavesLike.importIntoNewTableIsSelected();

                        theSubmitButtonIs('enabled');
                    });

                    context("when a source and destination table have been selected", function () {
                        beforeEach(function () {
                            this.dialog.$(".source a.dataset_picked").click();
                            this.sourceDatasets = [backboneFixtures.workspaceDataset.datasetTable({ objectName: "foo" })];
                            chorus.modal.trigger("datasets:selected", this.sourceDatasets, '.source');

                            this.dialog.$(".destination a.dataset_picked").click();
                            this.destinationDatasets = [backboneFixtures.workspaceDataset.datasetTable({ objectName: "biz" })];
                            chorus.modal.trigger("datasets:selected", this.destinationDatasets, '.destination');
                        });

                        context("when the limit checkbox is selected", function () {
                            var limitField;

                            beforeEach(function () {
                                limitField = this.dialog.$('.limit input[type=text]');
                                this.dialog.$('.limit input[type=checkbox]').prop('checked', true);
                            });

                            context("and the limit is valid", function () {
                                beforeEach(function () {
                                    limitField.val(500).trigger('keyup');
                                });

                                context("when submitting the form", function () {
                                    beforeEach(function () {
                                        this.dialog.$("form").submit();
                                    });

                                    it("posts to the correct url", function () {
                                        var url = this.server.lastCreateFor(this.dialog.model).url;
                                        expect(url).toBe(this.dialog.model.url());
                                    });

                                    it("submits the correct fields", function () {
                                        var json = this.server.lastCreateFor(this.dialog.model).json()['job_task'];
                                        expect(json['action']).toBe('import_source_data');
                                        expect(json['source_id']).toBe(this.sourceDatasets[0].get("id"));
                                        expect(json['destination_id']).toBe(this.destinationDatasets[0].get("id"));
                                        expect(json['new_table_name']).toBeUndefined();
                                        expect(json['row_limit']).toBe("500");
                                        expect(json['truncate']).toBe(false);
                                    });

                                    context("when the save succeeds", function () {
                                        beforeEach(function () {
                                            spyOn(this.dialog, "closeModal");
                                            spyOn(chorus, "toast");
                                            spyOn(this.dialog.job, 'trigger');
                                            this.server.lastCreateFor(this.dialog.model).succeed();
                                        });

                                        it("closes the modal", function () {
                                            expect(this.dialog.closeModal).toHaveBeenCalled();
                                        });

                                        it("should create a toast", function () {
                                            expect(chorus.toast).toHaveBeenCalledWith(this.dialog.message);
                                        });

                                        it("invalidates the job", function () {
                                            expect(this.dialog.job.trigger).toHaveBeenCalledWith('invalidated');
                                        });
                                    });
                                });
                            });

                            context("and the limit is invalid", function () {
                                beforeEach(function () {
                                    limitField.val('-1ab').trigger('keyup');
                                });

                                context("when submitting the form", function () {
                                    beforeEach(function () {
                                        this.dialog.$("form").submit();
                                    });

                                    it("has a validation error", function () {
                                        expect(this.dialog.$('.row_limit')).toHaveClass('has_error');
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        describe('options', function () {
            it("should have a 'Limit Rows' checkbox", function () {
                expect(this.dialog.$(".limit label")).toContainTranslation("import.limit_rows");
                expect(this.dialog.$(".limit input:checkbox")).not.toBeChecked();
            });

            it("should have a disabled textfield for the 'Limit Rows' value with the appropriate length", function () {
                expect(this.dialog.$(".limit input:text")).toBeDisabled();
                expect(this.dialog.$(".limit input:text").attr("maxlength")).toBe("10");
            });
        });

        it("should have a disabled 'Add' button", function () {
            expect(this.dialog.$("button.submit")).toBeDisabled();
        });
    });

    context("when initialized with a task", function () {
        beforeEach(function () {
            this.job = backboneFixtures.job();
            chorus.page = {};
            this.workspace = chorus.page.workspace = this.job.workspace();
            this.task = this.job.tasks().at(0);
            this.dialog = new chorus.dialogs.ConfigureImportSourceDataTask({model: this.task});
            this.dialog.render();
        });

        it('uses the task as its model', function () {
            expect(this.dialog.model).toEqual(this.task);
        });

        function checkFormValues() {
            var sourceTable = this.dialog.$('.choose_table.source').text();
            var truncateCheckBox = this.dialog.$('input[type="checkbox"].truncate').prop('checked');
            var rowLimitCheckBox = this.dialog.$('.limit input[type="checkbox"]').prop('checked');
            var rowLimitValue = this.dialog.$('.limit input[type="text"]').val();

            expect(sourceTable).toContainText(this.task.get('sourceName'));
            expect(truncateCheckBox).toBe(!!this.task.get('truncate'));
            expect(rowLimitCheckBox).toBe(this.task.get('rowLimit').length > 0);
            expect(rowLimitValue).toContainText(this.task.get('rowLimit'));
        }

        context("when the truncate value is true", function () {
            beforeEach(function () {
                this.task.set('truncate', true);
                this.dialog.render();
            });

            it("loads with the truncate box checked", function () {
                checkFormValues.call(this);
            });
        });

        context("when the destination table already exists", function () {
            beforeEach(function () {
                this.task.set('destinationId', 12345);
                this.dialog = new chorus.dialogs.ConfigureImportSourceDataTask({model: this.task});
                this.dialog.render();
            });

            it("populates form data", function () {
                checkFormValues.call(this);

                var destinationTable = this.dialog.$('.choose_table.destination');
                expect(destinationTable).toContainText(this.task.get('destinationName'));
                var existingTableRadio = this.dialog.$('.choose_table input[type="radio"]');
                expect(existingTableRadio).toBeChecked();
            });

            it("enables the submit button", function () {
                expect(this.dialog.$('button.submit')).toBeEnabled();
            });
        });

        context("when the destination table does not exist", function () {
            beforeEach(function () {
                this.task.set('destinationId', null);
                this.dialog = new chorus.dialogs.ConfigureImportSourceDataTask({model: this.task});
                this.dialog.render();
            });

            it("populates form data", function () {
                checkFormValues.call(this);

                var destinationTable = this.dialog.$('input.new_table_name').val();
                expect(destinationTable).toBe(this.task.get('destinationName'));
                var newTableRadio = this.dialog.$('.new_table input[type="radio"]');
                expect(newTableRadio).toBeChecked();
            });

            it("enables the submit button", function () {
                expect(this.dialog.$('button.submit')).toBeEnabled();
            });
        });

        it("has an 'Edit Task' title and a 'Save' button", function () {
            expect(this.dialog.$('.dialog_header h1')).toContainTranslation("create_job_task_dialog.edit_title");
            expect(this.dialog.$('button.submit')).toContainTranslation('create_job_task_dialog.save');
        });

        context("when submitting the form", function () {
            beforeEach(function () {
                this.dialog.$("form").submit();
            });

            it("posts to the correct url", function () {
                var url = this.server.lastUpdateFor(this.task).url;
                expect(url).toBe(this.task.url());
            });

            context("when the save succeeds", function () {
                beforeEach(function () {
                    spyOn(this.dialog, "closeModal");
                    this.server.lastUpdateFor(this.dialog.model).succeed();
                });

                it("closes the modal", function () {
                    expect(this.dialog.closeModal).toHaveBeenCalled();
                });
            });
        });
    });

    context("when the workspace has no sandbox", function() {
        beforeEach(function() {
            this.job = backboneFixtures.job();
            chorus.page = {};
            this.workspace = chorus.page.workspace = this.job.workspace();
            spyOn(this.workspace, 'sandbox').and.returnValue(undefined);
            this.dialog = new chorus.dialogs.ConfigureImportSourceDataTask({job: this.job});
            this.dialog.render();
        });

        it("displays a 'no sandbox' error", function() {
            expect(this.dialog.$('.errors')).toContainTranslation("field_error.EMPTY_SANDBOX");
        });
    });
});
