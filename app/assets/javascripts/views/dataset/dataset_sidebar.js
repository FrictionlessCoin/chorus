chorus.views.DatasetSidebar = chorus.views.Sidebar.extend({
    constructorName: "DatasetSidebarView",
    templateName: "dataset_sidebar",
    useLoadingSection: true,

    events: {
        "click .no_credentials a.add_credentials": "launchAddCredentialsDialog",
        "click .invalid_credentials a.update_credentials": "launchAddCredentialsDialog",
        "click .actions .associate": "launchAssociateWithWorkspaceDialog",
        "click .dataset_preview": "launchDatasetPreviewDialog",
        "click .actions a.analyze" : "launchAnalyzeAlert",
        "click a.duplicate": "launchDuplicateChorusView",
        "click .edit_tags": "startEditingTags",
        "click .new_work_flow": "launchWorkFlowDialog"
    },

    subviews: {
        '.tab_control': 'tabs'
    },

    setup: function() {
        this.subscribePageEvent("dataset:selected", this.setDataset);
        this.subscribePageEvent("column:selected", this.setColumn);
        this.subscribePageEvent("importSchedule:changed", this.updateImportSchedule);
        this.subscribePageEvent("analyze:running", this.resetStatistics);
        this.subscribePageEvent("start:visualization", this.enterVisualizationMode);
        this.subscribePageEvent("cancel:visualization", this.endVisualizationMode);
        this.tabs = new chorus.views.TabControl(['activity', 'statistics']);
        this.registerSubView(this.tabs);
    },

    render: function() {
        if (!this.disabled) {
            this._super("render", arguments);
        }
    },

    setColumn: function(column) {
        if (column) {
            this.selectedColumn = column;
            this.tabs.statistics.column = column;
        } else {
            delete this.selectedColumn;
            delete this.tabs.statistics.column;
        }

        this.render();
    },

    createActivitiesTab: function(dataset) {
        var activities = dataset.activities();
        activities.fetch();

        this.tabs.activity = new chorus.views.ActivityList({
            collection: activities,
            additionalClass: "sidebar",
            displayStyle: ['without_workspace'],
            type: t("database_object." + dataset.get('objectType'))
        });
        this.tabs.registerSubView(this.tabs.activity);
    },

    createStatisticsTab: function(dataset) {
        this.tabs.statistics = new chorus.views.DatasetStatistics({
            model: dataset,
            column: this.selectedColumn
        });
        this.tabs.registerSubView(this.tabs.statistics);

        var statistics = dataset.statistics();
        statistics.fetchIfNotLoaded();
        this.listenTo(statistics, "loaded", this.render);
        this.listenTo(statistics, "fetchFailed", this.statisticsFetchFailed);
    },

    fetchImports: function(dataset) {
        if(dataset.canBeImportSourceOrDestination()) {
            this.imports = dataset.getImports();
            this.importSchedules = dataset.getImportSchedules();
            this.listenTo(this.imports, "loaded", this.render);
            this.listenTo(this.importSchedules, "loaded", this.render);
            this.imports.fetch();
            this.importSchedules.fetch();
        }
    },

    statisticsFetchFailed: function() {
        if(this.resource.statistics().statusCode === 403) { this.resource.invalidCredentials = true; }
        this.render();
    },

    setDataset: function(dataset) {
        this.resource = dataset;
        this.tabs.statistics && this.tabs.statistics.teardown();
        this.tabs.activity && this.tabs.activity.teardown();
        if (dataset) {
            this.createActivitiesTab(dataset);
            this.createStatisticsTab(dataset);
            this.fetchImports(dataset);
        } else {
            delete this.tabs.statistics;
            delete this.tabs.activity;
            delete this.imports;
        }

        this.render();
    },

    resetStatistics: function(){
        this.resource.statistics().fetch();
    },

    additionalContext: function() {
        return new chorus.presenters.DatasetSidebar(this.resource, this.options);
    },

    postRender: function() {
        var $actionLinks = this.$("a.create_schedule, a.edit_schedule, a.import_now, a.download, a.delete");
        $actionLinks.data("dataset", this.resource);
        $actionLinks.data("workspace", this.resource && this.resource.workspace());
        this._super("postRender");
    },

    launchAddCredentialsDialog: function(e) {
        e && e.preventDefault();
        new chorus.dialogs.DataSourceAccount({ dataSource: this.resource.dataSource(), title: t("data_sources.sidebar.add_credentials"), reload: true, goBack: false }).launchModal();
    },

    launchAssociateWithWorkspaceDialog: function(e) {
        e.preventDefault();

        new chorus.dialogs.AssociateWithWorkspace({model: this.resource, activeOnly: true}).launchModal();
    },

    launchDatasetPreviewDialog: function(e) {
        e.preventDefault();

        new chorus.dialogs.DatasetPreview({model: this.resource}).launchModal();
    },

    launchAnalyzeAlert: function(e) {
        e && e.preventDefault();
        new chorus.alerts.Analyze({model: this.resource}).launchModal();
    },

    launchDuplicateChorusView: function(e) {
        e.preventDefault();
        var dialog = new chorus.dialogs.VerifyChorusView();
        dialog.setModel(this.resource.createDuplicateChorusView());
        dialog.launchModal();
    },

    launchWorkFlowDialog: function (e) {
        e && e.preventDefault();
        var dialog = new chorus.dialogs.WorkFlowNewForDatasetList({workspace: this.resource.workspace(), collection: new chorus.collections.Base([this.resource])});
        dialog.launchModal();
    },

    updateImportSchedule: function(importSchedule) {
        if(!this.resource)
            return;

        this.resource.getImportSchedules().reset([importSchedule]);
        this.render();
    },

    enterVisualizationMode: function() {
        $(this.el).addClass("visualizing");
    },

    endVisualizationMode: function() {
        $(this.el).removeClass("visualizing");
    },

    startEditingTags: function(e) {
        e.preventDefault();
        new chorus.dialogs.EditTags({collection: new chorus.collections.Base([this.resource])}).launchModal();
    }
});