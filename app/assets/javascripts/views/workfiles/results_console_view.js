chorus.views.ResultsConsole = chorus.views.Base.extend({
    templateName: "results_console",
    constructorName: "ResultsConsole",

    events: {
        "click .cancel": "cancelExecution",
        "click a.maximize": "maximizeTable",
        "click a.minimize": "minimizeTable",
        "click .expander_button": "toggleExpand",
        "click .close_errors": "clickCloseError",
        "click .sql_errors .view_details": "viewErrorDetails",
        "click .execution .view_details": "viewExecutionDetails",
        "click a.close": "clickClose",
        "click a.download_csv": "saveToDesktop"
    },

    defaultBoundingContainer: function (view) {
        return {
            getAvailableHeight: function () {
                return $(window).height() - this.distanceFromTopOfWindow() - this.distanceFromBottomOfWindow();
            },

            distanceFromTopOfWindow: function() {
                var distance = view.$(".data_grid").offset().top;
                return distance - $(window).scrollTop();
            },

            distanceFromBottomOfWindow: function() {
                var verticalDialogPosition = 0;
                if (view.options.verticalDialogPosition) {
                    verticalDialogPosition = view.options.verticalDialogPosition;
                }

                return verticalDialogPosition + this.bottomGutterHeight() + this.footerSize();
            },

            bottomGutterHeight: function() {
                var bottomGutter = view.$(".bottom_gutter");
                if( bottomGutter.is(":visible") ){
                    return bottomGutter.height();
                } else {
                    return 0;
                }
            },

            footerSize: function() {
                if (view.options.footerSize) {
                    return view.options.footerSize();
                } else {
                    return 0;
                }
            }
        };
    },

    setup: function() {
        this.boundingContainer = this.options.boundingContainer || this.defaultBoundingContainer(this);
        this.showDownloadDialog = this.options.showDownloadDialog;
        this.dataset = this.options.dataset;
        this.subscribePageEvent("file:executionStarted", this.executionStarted);
        this.subscribePageEvent("file:executionSucceeded", this.executionSucceeded);
        this.subscribePageEvent("file:executionFailed", this.executionFailed);
        this.subscribePageEvent("file:executionCancelled", this.hideSpinner);
    },

    teardown: function() {
        this.model && this.model.cancel();
        this._super("teardown", arguments);
    },

    saveToDesktop: function(e) {
        e.preventDefault();
        if(this.showDownloadDialog) {
            var dialog = new chorus.dialogs.DatasetDownload({ pageModel: this.dataset });
            dialog.launchModal();
        } else {
            var data = {
                content: this.constructFileContent(),
                filename: this.resource.name() + ".csv",
                mime_type: "text/csv"
            };
            chorus.fileDownload("/download_data", { data: data, httpMethod: "POST" });
        }
    },

    constructFileContent: function() {
        var columnNames = _.pluck(this.resource.getColumns(), "name");
        var uniqueNames = _.pluck(this.resource.getColumns(), "uniqueName");
        return new chorus.utilities.CsvWriter(columnNames, uniqueNames, this.resource.getRows(), this.options).toCsv();
    },

    execute: function(task) {
        this.setModel(task);
        task.save();
        this.executionStarted();
        this.listenTo(task, "saved", _.bind(this.executionSucceeded, this, task));
        this.listenTo(task, "saveFailed", _.bind(this.executionFailed, this, task));
    },

    executionStarted: function() {
        this.executionStartedTime = $.now();
        this.$('.controls').addClass('hidden');
        this.$(".right").addClass("executing");
        this.$(".spinner").addClass("hidden").startLoading();
        _.delay(_.bind(this.showSpinner, this), 250);
        this.$(".elapsed_time").text("");
        this.elapsedTimer = setInterval(_.bind(this.updateElapsedTime, this), 1000);
        this.$(".execution").removeClass("hidden");
        this.$(".bottom_gutter").addClass("hidden");
        this.$(".result_table").addClass("hidden").empty();
        this.closeError();
    },

    showSpinner: function() {
        this.$(".spinner").removeClass("hidden");
    },

    updateElapsedTime: function() {
        var seconds = Math.round(($.now() - this.executionStartedTime)/1000);
        this.$(".elapsed_time").text(t("results_console_view.elapsed", { sec: seconds }));
    },

    hideSpinner: function() {
        this.cancelTimers();
        this.$(".right").removeClass("executing");
        this.$(".spinner").addClass('hidden').stopLoading();
    },

    executionSucceeded: function(task) {
        this.initializeDataGrid(task);
        this.hideSpinner();
        if (!task.hasResults()) {
            this.collapseTable();
        }
    },

    initializeDataGrid: function(task) {
        this.dataGrid && this.dataGrid.teardown();
        this.dataGrid = new chorus.views.DataGrid({model: task});
        this.registerSubView(this.dataGrid);
        this.$(".result_table").removeClass("hidden").html(this.dataGrid.el);
        this.$(".controls").removeClass("hidden");
        this.dataGrid.render();
        this.minimizeTable();
    },

    executionFailed: function(task) {
        this.showErrors();
        this.hideSpinner();
    },

    showErrors: function() {
        this.$(".sql_errors").removeClass("hidden");
        this.$(".result_table").addClass("hidden");
        this.$(".bottom_gutter").addClass("hidden");
        this.$(".execution").addClass("hidden");
        this.$(".message").empty();
    },

    cancelExecution: function(event) {
        this.cancelTimers();
        event && event.preventDefault();
        this.model && this.model.cancel();
        this.clickClose();
    },

    cancelTimers: function() {
        if (this.elapsedTimer) {
            clearInterval(this.elapsedTimer);
            delete this.elapsedTimer;
        }
    },

    minimizeTable: function(e) {
        e && e.preventDefault();
        this.$('.data_grid').css("height", "");
        this.$("a.minimize").addClass("hidden");
        this.$("a.maximize").removeClass("hidden");
        this.$(".controls").removeClass("collapsed");

        this.$(".result_table").removeClass("collapsed");
        this.$(".result_table").removeClass("maximized");
        this.$(".result_table").addClass("minimized");

        this.$(".bottom_gutter").removeClass("hidden");
        this.$(".arrow").removeClass("down");
        this.$(".arrow").addClass("up");
        this.dataGrid.resizeGridToResultsConsole();
        this.recalculateScrolling();
    },

    maximizeTable: function(e) {
        e && e.preventDefault();
        this.$("a.maximize").addClass("hidden");
        this.$("a.minimize").removeClass("hidden");
        this.$(".controls").removeClass("collapsed");

        this.$(".result_table").removeClass("collapsed");
        this.$(".result_table").removeClass("minimized");
        this.$(".result_table").addClass("maximized");
        this.$(".data_grid").css("height", this.getDesiredDataGridHeight());
        this.dataGrid.resizeGridToResultsConsole();
        this.recalculateScrolling();
    },

    getDesiredDataGridHeight: function() {
        var baseHeight = this.boundingContainer.getAvailableHeight();
        var arbitrarySpacing = 2; // to eliminate spurious y-scrollbar
        return baseHeight - arbitrarySpacing;
    },

    collapseTable: function() {
        this.$("a.maximize").addClass("hidden");
        this.$("a.minimize").addClass("hidden");
        this.$(".controls").addClass("collapsed");

        this.$(".result_table").addClass("collapsed");
        this.$(".result_table").removeClass("minimized");
        this.$(".result_table").removeClass("maximized");
        this.$(".data_grid").css("height", "");
    },

    closeError: function(e) {
        e && e.preventDefault();
        this.$(".sql_errors").addClass("hidden");
    },

    clickCloseError: function(e) {
        e && e.preventDefault();
        this.closeError();
        this.clickClose();
    },

    viewErrorDetails: function(e) {
        e.preventDefault();
        var alert = new chorus.alerts.ExecutionError({ model: this.model });
        alert.launchModal();
    },

    viewExecutionDetails: function(e) {
        e.preventDefault();
        var alert = new chorus.alerts.ExecutionMessage({ model: this.model });
        alert.launchModal();
    },

    toggleExpand: function() {
        var $arrow = this.$(".arrow");
        if ($arrow.is(".up")) {
            $arrow.removeClass("up").addClass("down");
            this._shouldMinimize = this.$('.result_table').is(".minimized");
            this.collapseTable();
        } else {
            $arrow.removeClass("down").addClass("up");
            if (this._shouldMinimize) {
                this.minimizeTable();
            } else {
                this.maximizeTable();
            }
        }
    },

    clickClose: function(e) {
        e && e.preventDefault();
        this.$(".controls").addClass("hidden");
        chorus.PageEvents.trigger("action:closePreview");
    },

    additionalContext: function(ctx) {
        return {
            titleKey: this.options.titleKey || "results_console_view.title",
            enableClose: this.options.enableClose,
            enableResize: this.options.enableResize,
            enableExpander: this.options.enableExpander,
            hasResults: this.model && this.model.hasResults()
        };
    }
});