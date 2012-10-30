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

    setup: function() {
        this.showDownloadDialog = this.options.showDownloadDialog;
        this.dataset = this.options.dataset;
        chorus.PageEvents.subscribe("file:executionStarted", this.executionStarted, this);
        chorus.PageEvents.subscribe("file:executionSucceeded", this.executionSucceeded, this);
        chorus.PageEvents.subscribe("file:executionFailed", this.executionFailed, this);
        chorus.PageEvents.subscribe("file:executionCancelled", this.hideSpinner, this);
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
            $.fileDownload("/download_data", { data: data, httpMethod: "post" });
        }
    },

    constructFileContent: function() {
        var columnNames = _.pluck(this.resource.getColumns(), "name");
        return new chorus.utilities.CsvWriter(
            columnNames, this.resource.getRows(), this.options).toCsv();

    },

    execute: function(task) {
        this.setModel(task);
        task.save();
        this.executionStarted();
        this.bindings.add(task, "saved", _.bind(this.executionSucceeded, this, task));
        this.bindings.add(task, "saveFailed", _.bind(this.executionFailed, this, task));
    },

    executionStarted: function() {
        this.executionStartedTime = $.now();
        this.$('.controls').addClass('hidden');
        this.$(".right").addClass("executing")

        this.$(".spinner").addClass("hidden").startLoading();
        _.delay(_.bind(this.showSpinner, this), 250);
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
        this.cancelTimers()
        this.$(".right").removeClass("executing");
        this.$(".spinner").addClass('hidden').stopLoading();
    },

    executionSucceeded: function(task) {
        this.showResultTable(task);
        this.hideSpinner();

        if (!task.hasResults()) {
            this.collapseTable();
        }
    },

    showResultTable: function(task) {
        this.dataTable && this.dataTable.teardown();
        this.dataTable = new chorus.views.TaskDataTable({shuttle: this.options.shuttle, model: task});
        this.registerSubView(this.dataTable);
        this.dataTable.render();
        this.$(".result_table").removeClass("hidden").html(this.dataTable.el);
        this.$(".controls").removeClass("hidden");
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
        e && e.preventDefault()
        this.$('.data_table').css("height", "");
        this.$("a.minimize").addClass("hidden");
        this.$("a.maximize").removeClass("hidden");
        this.$(".controls").removeClass("collapsed");

        this.$(".result_table").removeClass("collapsed");
        this.$(".result_table").removeClass("maximized");
        this.$(".result_table").addClass("minimized");

        this.$(".bottom_gutter").removeClass("hidden");
        this.$(".arrow").removeClass("down");
        this.$(".arrow").addClass("up");
        this.recalculateScrolling();
    },

    maximizeTable: function(e) {
        e && e.preventDefault()
        this.$("a.maximize").addClass("hidden");
        this.$("a.minimize").removeClass("hidden");
        this.$(".controls").removeClass("collapsed");

        this.$(".result_table").removeClass("collapsed");
        this.$(".result_table").removeClass("minimized");
        this.$(".result_table").addClass("maximized");
        this.$(".data_table").css("height", this.getDesiredDataTableHeight());
        this.recalculateScrolling();
    },

    getDesiredDataTableHeight: function() {
        return $(window).height() - this.$(".data_table").offset().top - this.$(".bottom_gutter").height() - this.footerSize();
    },

    footerSize: function() {
        if (this.options.footerSize) {
            return this.options.footerSize();
        }
        return 0;
    },

    collapseTable: function() {
        this.$("a.maximize").addClass("hidden");
        this.$("a.minimize").addClass("hidden");
        this.$(".controls").addClass("collapsed");

        this.$(".result_table").addClass("collapsed");
        this.$(".result_table").removeClass("minimized");
        this.$(".result_table").removeClass("maximized");
        this.$(".data_table").css("height", "");
    },

    closeError: function(e) {
        e && e.preventDefault();
        this.$(".sql_errors").addClass("hidden");
    },

    clickCloseError: function(e) {
        e && e.preventDefault();
        this.closeError();
        this.clickClose()
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
        chorus.PageEvents.broadcast("action:closePreview");
    },

    additionalContext: function(ctx) {
        return {
            titleKey: this.options.titleKey || "results_console_view.title",
            enableClose: this.options.enableClose,
            enableResize: this.options.enableResize,
            enableExpander: this.options.enableExpander,
            hasResults: this.model && this.model.hasResults()
        }
    }
});

