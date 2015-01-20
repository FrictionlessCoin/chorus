chorus.views.CreateChorusViewSidebar = chorus.views.Sidebar.extend({
    constructorName: 'CreateChorusViewSidebar',
    templateName: "dataset_create_chorus_view_sidebar",

    events: {
        "click button.create": "createChorusView",
        "click a.remove": "removeColumnClicked",
        "click span.delete": "removeJoinClicked",
        "click a.preview": "previewSqlLinkClicked",
        "click a.add_join": "launchManageJoinTableDialog"
    },

    setup: function() {
        this.subscribePageEvent("column:selected", this.addColumn);
        this.subscribePageEvent("column:deselected", this.removeColumn);
        this.chorusView = this.model.deriveChorusView();
        this.chorusView.aggregateColumnSet = this.options.aggregateColumnSet;
        this.listenTo(this.chorusView, "change", this.render);
    },

    teardown: function() {
        this.options.aggregateColumnSet.each(function(column) { delete column.selected; });
        this._super("teardown", arguments);
    },

    postRender: function() {
        this.$("a.preview, button.create").data("parent", this);
        this.$("a.add_join").data("chorusView", this.chorusView);
        this._super("postRender");
    },

    additionalContext: function(ctx) {
        return {
            columns: this.chorusView.sourceObjectColumns,
            joins: this.chorusView.joins
        };
    },

    addColumn: function(column) {
        this.chorusView.addColumn(column);
        this.$("button.create").prop("disabled", false);
    },

    removeColumn: function(column) {
        if (!column) {
            return;
        }
        this.chorusView.removeColumn(column);
    },

    removeColumnClicked: function(e) {
        e.preventDefault();
        var $li = $(e.target).closest("li");
        var column = this.chorusView.aggregateColumnSet.get($li.data('cid'));
        this.removeColumn(column);
        chorus.PageEvents.trigger("column:removed", column);
    },

    removeJoinClicked: function(e) {
        var cid = $(e.target).closest("div.join").data("cid");
        var dialog = new chorus.alerts.RemoveJoinConfirmAlert({dataset: this.chorusView.getJoinDatasetByCid(cid), chorusView: this.chorusView});
        dialog.launchModal();
    },

    previewSqlLinkClicked: function(e) {
        e.preventDefault();
        this.chorusView.set({ query: this.sql() });
        var dialog = new chorus.dialogs.SqlPreview({ model: this.chorusView });
        dialog.launchModal();
    },

    createChorusView: function(e) {
        e && e.preventDefault();
        this.chorusView.set({ query: this.sql() });
        var dialog = new chorus.dialogs.VerifyChorusView({ model : this.chorusView });
        dialog.launchModal();
    },

    whereClause: function() {
        return this.filters.whereClause();
    },

    sql: function() {
        return [this.chorusView.generateSelectClause(), this.chorusView.generateFromClause(), this.whereClause()].join("\n");
    },

    launchManageJoinTableDialog: function(e) {
        e.preventDefault();
        var dialog = new chorus.dialogs.ManageJoinTables({
            pageModel: this.model,
            chorusView: this.chorusView
        });
        dialog.launchModal();
    }
});
