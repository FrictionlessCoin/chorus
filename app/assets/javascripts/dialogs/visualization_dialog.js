chorus.dialogs.Visualization = chorus.dialogs.Base.extend({
    constructorName: "Visualization",
    templateName: "visualization",

    subviews: {
        ".tabledata": "tableData",
        ".filter_options": "filterWizard"
    },

    events: {
        "click a.show": "showDataset",
        "click a.hide": "hideDataset",
        "click a.show_options": "showFilterOptions",
        "click a.hide_options": "hideFilterOptions",
        "click button.close_dialog": "closeModal",
        "click button.refresh": "refreshChart",
        "click .overlay:not(.disabled)": "refreshChart",
        "click button.revert": "revertFilters",
        "click button.stop": "cancelRefresh"
    },

    setup: function() {
        this.task = this.options.task;

        var workspace = this.task.workspace();
        if(workspace) {
            this.requiredResources.add(workspace);
            workspace.fetch();
        }
        this.type = this.options.chartOptions.type;
        this.title = t("visualization.title", {name: this.options.chartOptions.name});
        this.filters = this.options.filters.clone();
        this.lastSavedFilters = this.options.filters.clone();
        this.filterWizard = new chorus.views.DatasetFilterWizard({collection: this.filters, columnSet: this.options.columnSet});
        this.tableData = new chorus.views.ResultsConsole({shuttle: false, enableResize: true, enableExpander: false, model: this.task, footerSize: _.bind(this.footerSize, this)});
        this.bindings.add(this.filters, "add remove change", this.filtersChanged, this);
    },

    footerSize: function() {
        return this.$('.modal_controls').outerHeight(true);
    },

    postRender: function() {
        this.tableData.showResultTable(this.task);
        this.tableData.$('.expander_button').remove();
        this.$('.chart_icon.' + this.type).addClass("selected");

        var menuItems = [
            {
                name: "save_as_note",
                text: t("visualization.save_as_note"),
                onSelect: _.bind(this.saveAsNoteAttachment, this)
            },
            {
                name: "save_to_desktop",
                text: t("visualization.save_to_desktop"),
                onSelect: _.bind(this.saveToDesktop, this)
            }
        ];

        var inArchivedWorkspace = this.task.workspace() && !this.task.workspace().isActive();
        if (!inArchivedWorkspace) {
            menuItems.unshift({
                name: "save_as_workfile",
                text: t("visualization.save_as_workfile"),
                onSelect: _.bind(this.saveAsWorkfile, this)
            });
        }

        new chorus.views.Menu({
            launchElement: this.$('button.save'),
            orientation: "right",
            items: menuItems
        });
    },

    drawChart: function() {
        if (this.isValidData()) {
            this.$(".modal_controls a.hide").addClass("hidden");
            this.$(".modal_controls a.show").removeClass("hidden");
            this.$("button.save").prop("disabled", false);
            this.$("button.save").prop("disabled", false);
            this.chart = new chorus.views.visualizations[_.capitalize(this.type)]({model: this.task});
            this.subviews[".chart_area"] = "chart";
            this.renderSubview("chart");
        } else {
            this.emptyDataWarning = new chorus.views.visualizations.EmptyDataWarning()
            this.subviews[".chart_area"] = "emptyDataWarning";
            this.renderSubview("emptyDataWarning");
        }
    },

    refreshChart: function() {
        this.$(".overlay").addClass("disabled");
        this.task.set({filters: this.filters && this.filters.sqlStrings()});
        this.task.bindOnce("saveFailed", this.saveFailed, this);
        this.task.save();

        this.showButtons(["stop", "refresh"]);
        this.$("button.refresh").startLoading("visualization.refreshing");
        this.bindings.add(this.task, "saved", this.chartRefreshed, this);
    },

    saveFailed: function() {
        this.showErrors(this.task);
        this.$("button.refresh").stopLoading();
    },

    chartRefreshed: function() {
        this.drawChart();
        this.chartUpToDate();
    },

    chartUpToDate: function() {
        this.lastSavedFilters = this.filters.clone();
        this.$(".overlay").addClass('hidden');
        this.$("button.refresh").stopLoading();
        this.showButtons(["save", "close_dialog"]);
    },

    cancelRefresh: function() {
        this.task.cancel();
        this.bindings.add(this.task, "canceled", this.filtersChanged);
        this.$("button.refresh").stopLoading();
    },

    showButtons: function(buttonClasses) {
        var buttons = this.$("button");
        buttons.addClass("hidden");
        _.each(buttonClasses, function(buttonClass) {
            buttons.filter("." + buttonClass).removeClass("hidden");
        });
    },

    isValidData: function() {
        return !_.isEmpty(this.task.get("rows"));
    },

    makeFilename: function() {
        return this.sanitizeFilename(this.options.chartOptions.name + "-" + this.options.chartOptions.type) + ".png";
    },

    makeSvgData: function() {
        var svg = this.$(".chart_area.visualization svg")[0];
        if (BrowserDetect.browser != "Explorer") {
            svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        }
        return new XMLSerializer().serializeToString(svg);
    },

    saveWorkfile: function(workspace) {
        this.$('button.save').startLoading("actions.saving");

        var workspaceId = workspace ? workspace.get("id") : this.task.get("workspaceId");

        this.workfile = new chorus.models.Workfile({
            workspaceId: workspaceId,
            source: "visualization",
            svgData: this.makeSvgData(),
            fileName: this.makeFilename()
        });
        this.workfile.save();
        this.workfile.bindOnce('saved', this.onWorkfileSaved, this);
    },

    onWorkfileSaved: function() {
        this.$('button.save').stopLoading();
        chorus.toast("dataset.visualization.toast.workfile_from_chart", {fileName: this.workfile.get("fileName")})
    },

    additionalContext: function() {
        return {
            filterCount: this.effectiveFilterLength(),
            chartType: t("dataset.visualization.names." + this.type),
            workspaceId: this.task.get("workspaceId"),
            hasChart: !!this.chart,
            entityName: this.model.get("objectName"),
            serverErrors: this.task.serverErrors
        }
    },

    showFilterOptions: function(e) {
        e && e.preventDefault();

        this.$("a.show_options").addClass("hidden");
        this.$("a.hide_options").removeClass("hidden");
        this.$(".filter_options").removeClass("hidden");
    },

    hideFilterOptions: function(e) {
        e && e.preventDefault();

        this.$("a.show_options").removeClass("hidden");
        this.$("a.hide_options").addClass("hidden");
        this.$(".filter_options").addClass("hidden");
    },

    effectiveFilterLength: function(){
        return _.compact(_.map(this.filters.models, function(model) {return model.isComplete(); })).length;
    },

    filtersChanged: function() {
        if (this.filters.whereClause() == this.lastSavedFilters.whereClause()) {
            this.chartUpToDate();
        } else {
            this.$(".overlay").removeClass("hidden");
            this.$(".overlay").removeClass("disabled");
            this.showButtons(["refresh", "revert"]);
        }
    },

    revertFilters: function() {
        this.filters = this.lastSavedFilters;
        this.bindings.add(this.filters, "remove change", this.filtersChanged, this);
        this.filterWizard.collection = this.filters;
        this.filterWizard.render();
        this.chartUpToDate();
    },

    showDataset: function(e) {
        e && e.preventDefault();
        this.$('.results_console').removeClass("hidden");
        this.$(".modal_controls a.hide").removeClass("hidden");
        this.$(".modal_controls a.show").addClass("hidden");
        this.recalculateScrolling();
    },

    hideDataset: function(e) {
        e && e.preventDefault();
        this.$('.results_console').addClass("hidden")
        this.$(".modal_controls a.show").removeClass("hidden");
        this.$(".modal_controls a.hide").addClass("hidden");
    },

    saveToDesktop: function() {
        $.download("/downloadChart.jsp", {
            svg: this.makeSvgData(),
            "chart-name": this.options.chartOptions.name,
            "chart-type": this.options.chartOptions.type
        }, "post");
    },

    saveAsNoteAttachment: function() {
        this.notesNewDialog = new chorus.dialogs.VisualizationNotesNew({
            pageModel: this.model,
            entityId: this.model.get("id"),
            entityName: this.model.name(),
            entityType: "dataset",
            workspaceId: this.model.get("workspace") && this.model.get("workspace").id,
            allowWorkspaceAttachments: !!this.task.get("workspaceId"),
            attachVisualization: {
                fileName: this.makeFilename(),
                svgData: this.makeSvgData()
            }
        })
        this.launchSubModal(this.notesNewDialog);
    },

    saveAsWorkfile: function() {
        if (!this.task.get("workspaceId")) {
            this.workspacePicker = new chorus.dialogs.VisualizationWorkspacePicker();
            this.launchSubModal(this.workspacePicker);
            this.workspacePicker.bindOnce("workspace:selected", this.saveWorkfile, this);
        } else {
            this.saveWorkfile();
        }
    },

    sanitizeFilename: function(fileName) {
        return fileName.replace(/[^A-Z0-9_\-.]/gi, '')
    }
});
