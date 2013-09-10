chorus.dialogs.FileImport = chorus.dialogs.Base.extend({
    constructorName: "FileImport",

    templateName: "dataset_import",
    title: t("dataset.import.title"),

    makeModel: function() {
        this.workspace = this.options.workspace;
        this.resource = this.model = this.csvImport = new chorus.models.CSVImport({ workspaceId: this.workspace.id });
        this.csvOptions = {hasHeader: true};
    },

    setup: function() {
        this.config = chorus.models.Config.instance();
    },

    events: {
        "change input:radio": "onRadioSelect",
        "submit form": "uploadFile",
        "click button.submit": "uploadFile",
        "click a.dataset_picked": "launchDatasetPickerDialog"
    },

    launchDatasetPickerDialog: function(e) {
        e.preventDefault();
        if (!this.saving) {
            var datasetDialog = new chorus.dialogs.DatasetsPicker({ collection: this.workspace.sandboxTables({allImportDestinations: true}) });
            this.listenTo(datasetDialog, "datasets:selected", this.datasetsChosen);
            this.launchSubModal(datasetDialog);
        }
    },

    datasetsChosen: function(dataset) {
        this.selectedDataset = dataset[0];
        this.changeSelectedDataset(dataset && dataset[0] && dataset[0].name());
    },

    onRadioSelect: function(e) {
        this.$(".new_table input:text").prop("disabled", true);
        this.$(".existing_table select").prop("disabled", true);
        this.$(".existing_table .options").addClass('hidden');
        this.$(".existing_table .options input").prop("disabled", true);

        this.importTarget = $(e.currentTarget).val();
        if (this.importTarget === "new") {
            this.$(".new_table input:text").prop("disabled", false);
            this.$("button.submit").prop("disabled", false);
            this.$("a.dataset_picked").addClass("hidden");

            if (this.selectedDataset) {
                this.$("span.dataset_picked").removeClass("hidden");
            }

        } else if (this.importTarget === "existing") {
            this.$("a.dataset_picked").removeClass("hidden");
            this.$("span.dataset_picked").addClass("hidden");

            this.$(".existing_table .options").removeClass("hidden");
            this.$(".existing_table .options input").prop("disabled", false);
        }

        this.enableButton();
    },

    changeSelectedDataset: function(name) {
        this.$(".existing_table a.dataset_picked").text(_.prune(name, 20));
        this.$(".existing_table span.dataset_picked").text(_.prune(name, 20));

        this.enableButton();
    },

    enableButton: function() {
        if (this.selectedDataset || this.importTarget !== "existing") {
            this.$("button.submit").prop("disabled", false);
        } else {
            this.$("button.submit").prop("disabled", true);
        }
    },

    additionalContext: function() {
        return { canonicalName: this.workspace.sandbox().canonicalName() };
    },

    importDestination: function() {
        if (this.importTarget === "existing") {
            return (this.selectedDataset && this.selectedDataset.name()) || "";
        } else if (this.importTarget === "new") {
            return chorus.utilities.CsvParser.normalizeForDatabase(this.$('.new_table input:text').val());
        }
    },

    uploadFile: function(e) {
        e && e.preventDefault();
        this.$("button.choose").prop("disabled", true);
        this.$(".file-wrapper a").addClass("hidden");
        this.$(".import_controls input[type=radio]").prop("disabled", true);
        if (this.importTarget === "workfile") {
            $(this.uploadObj.fileInput[0]).attr("name", "workfile[versions_attributes][0][contents]");
            this.$("button.submit").startLoading("actions.uploading");
            this.uploadObj.url = "/workspaces/" + this.workspace.id + "/workfiles";
            this.uploadObj.source = "fs";
            this.request = this.uploadObj.submit();
        } else {
            this.csvOptions.tableName = this.importDestination();

            this.csvImport.set({
                destinationType: this.importTarget,
                toTable: this.importDestination(),
                truncate: this.$(".existing_table input#truncate").is(':checked')
            }, {silent: true});

            if (this.csvImport.performValidation()) {
                this.$("button.submit").startLoading("actions.uploading");
                this.clearErrors();
                this.uploadObj.url = "/workspaces/" + this.workspace.id + "/csv";
                this.uploadObj.type = "POST";
                this.uploadObj.source = "fs";
                this.request = this.uploadObj.submit();
            } else {
                this.$("button.choose").prop("disabled", false);
                this.$(".file-wrapper a").removeClass("hidden");
                this.$(".import_controls input[type=radio]").prop("disabled", false);
                this.showErrors(this.model);
            }
        }
    },

    modalClosed: function() {
        if (this.request) {
            this.request.abort();
        }

        this._super("modalClosed");
    },

    uploadFailed: function(e, response) {
        e && e.preventDefault();
        this.$(".file-wrapper a").removeClass("hidden");
        this.$(".import_controls input[type=radio]").prop("disabled", false);
        try {
            var errors = JSON.parse(response.jqXHR.responseText).errors;
            if(errors.fields.contents_file_size && errors.fields.contents_file_size.LESS_THAN) {
                var count = errors.fields.contents_file_size.LESS_THAN.count;
                errors.fields.contents_file_size.LESS_THAN.count = count.split(" ")[0]/1024/1024 + " MB";
            }
            this.model.serverErrors = errors;
        } catch(error) {
            var status = response.jqXHR.status;
            var statusText = response.jqXHR.statusText;
            this.displayNginxError(status, statusText);
        }
        this.model.trigger("saveFailed");
    },

    displayNginxError: function(status, statusText) {
        this.model.serverErrors = {
            "fields": {
                "base": {
                    GENERIC: {
                        message: status + ": " + statusText
                    }
                }
            }
        };
    },

    uploadFinished: function(e) {
        e && e.preventDefault();
        this.$(".file-wrapper a").removeClass("hidden");
        this.$(".import_controls input[type=radio]").prop("disabled", false);
        this.$("button.submit").stopLoading();
    },

    uploadSuccess: function(e, data) {
        e && e.preventDefault();

        if (this.importTarget === "workfile") {
            var workfile = new chorus.models.Workfile();
            workfile.set(workfile.parse(data.result), {silent: true});

            chorus.toast("dataset.import.workfile_success", {fileName: workfile.get("fileName")});
            chorus.router.navigate(workfile.hasOwnPage() ? workfile.showUrl() : workfile.workfilesUrl());
        } else {
            var workingCsvImport = this.csvImport.clone();
            var contents = data.result.response.contents;
            this.csvOptions.contents = contents;
            var csvId = data.result.response.id;
            workingCsvImport.set({
                csvId:csvId,
                contents:contents
            });

            var csvParser = new chorus.utilities.CsvParser(contents, this.csvOptions);
            if ((csvParser.getColumnOrientedData().length === 0) && !csvParser.serverErrors) {
                var alert = new chorus.alerts.EmptyCSV();
                alert.launchModal();
            } else {
                var dialog;
                if (this.importTarget === "existing") {
                    dialog = new chorus.dialogs.ExistingTableImportCSV({model: workingCsvImport, datasetId: this.selectedDataset.get("id"), csvOptions: this.csvOptions});
                } else {
                    dialog = new chorus.dialogs.NewTableImportCSV({model: workingCsvImport, csvOptions: this.csvOptions});
                }
                this.subscribePageEvent("csv_import:started", this.closeModal);
                dialog.launchModal();
            }
        }
    },

    fileChosen: function(e, data) {
        this.$("button.submit").prop("disabled", false);
        this.$('.empty_selection').addClass('hidden');

        this.uploadObj = data;
        var filename = data.files[0].name;
        var filenameComponents = filename.split('.');
        var basename = _.first(filenameComponents);
        var extension = _.last(filenameComponents);
        this.$(".file_name").text(filename);
        this.$(".new_table input[type='text']").val(basename.toLowerCase().replace(/ /g, '_'));

        this.$("img").removeClass("hidden");
        this.$("img").attr("src", chorus.urlHelpers.fileIconUrl(extension, "icon"));

        this.$(".import_controls").removeClass("hidden");

        this.$(".file-wrapper a").removeClass("hidden");
        this.$(".file-wrapper button").addClass("hidden");

        this.$("input[type=file]").prop("title", t("dataset.import.change_file"));

        this.validateFileSize();
    },

    validateFileSize: function() {
        this.clearErrors();
        if (!this.model) return;

        var maxFileSize = this.config.get("fileSizesMbCsvImports");

        _.each( this.uploadObj.files, function(file) {
            if (file.size > (maxFileSize * 1024 * 1024)) {
                this.model.serverErrors = {
                    "fields": {
                        "base": {
                            "FILE_SIZE_EXCEEDED": {
                                "count": maxFileSize
                            }
                        }
                    }
                };
                this.$("button.submit").prop("disabled", true);
                this.showErrors(this.model);
            }
        }, this);
    },

    postRender: function() {
        this.importTarget = "new";

        this.$("input[type=file]").fileupload({
            change: _.bind(this.fileChosen, this),
            add: _.bind(this.fileChosen, this),
            done: _.bind(this.uploadSuccess, this),
            fail: _.bind(this.uploadFailed, this),
            always: _.bind(this.uploadFinished, this),
            dataType: "json"
        });
    }
});
