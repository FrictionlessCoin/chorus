chorus.dialogs.CreateExternalTableFromHdfs = chorus.dialogs.NewTableImportCSV.extend({
    constructorName: "CreateExternalTableFromHdfs",
    title: t("hdfs.create_external.title"),
    ok: t("hdfs.create_external.ok"),
    useLoadingSection: true,
    loadingKey: "hdfs.create_external.creating",
    includeHeader: false,

    events: {
        "change select": "selectWorkspace"
    },

    setup: function() {
        this._super("setup", arguments);

        this.workspaces = new chorus.collections.WorkspaceSet([], {userId: chorus.session.user().id});
        this.workspaces.fetchAll();
        this.requiredResources.push(this.workspaces);
        this.csv.set({toTable: chorus.utilities.CsvParser.normalizeForDatabase(this.csv.get("toTable"))});
    },

    postRender: function() {
        this._super("postRender", arguments);

        if (this.workspaces.loaded) {
            if (!this.workspaces.length) {
                this.workspaces.serverErrors = { fields: { workspaces: { EMPTY: {} } } }
                this.showErrors(this.workspaces);
            }

            this.$("select").val(this.csv.get("workspaceId"));

            chorus.styleSelect(this.$("select"));
        }
    },

    saved: function() {
        this.closeModal();
        chorus.toast("hdfs.create_external.success", {workspaceName: this.workspaceName, tableName: this.csv.get("toTable")});
        chorus.PageEvents.broadcast("csv_import:started");
    },

    prepareCsv: function() {
        var $names = this.$(".column_names input:text");
        var $types = this.$(".data_types .chosen");
        var toTable = this.$(".directions input:text").val();
        var columns = _.map($names, function(name, i) {
            var $name = $names.eq(i);
            var $type = $types.eq(i);
            return chorus.Mixins.dbHelpers.safePGName($name.val()) + " " + $type.text();
        })
        var statement = toTable + " (" + columns.join(", ") + ")";

        this.workspaceName = this.$("option:selected").text();
        this.tableName = this.$(".directions input:text").val();

        this.csv.set({
            workspaceId: this.$("option:selected").val(),
            statement: statement,
            toTable: chorus.utilities.CsvParser.normalizeForDatabase(this.$(".directions input:text").val())
        });
    },

    selectWorkspace: function() {
        this.csv.set({workspaceId: this.$("option:selected").val()});
    },

    resourcesLoaded: function() {
        var withSandboxes = this.workspaces.filter(function(ws) {
            return !!ws.sandbox();
        });

        this.workspaces.reset(withSandboxes, {silent: true});
    },

    additionalContext: function() {
        var parentCtx = this._super("additionalContext", arguments);
        parentCtx.workspaces = _.pluck(this.workspaces.models, "attributes");
        parentCtx.directions = new Handlebars.SafeString("<input type='text' class='hdfs' name='toTable' value='" + Handlebars.Utils.escapeExpression(this.csv.get("toTable")) + "'/>");
        return parentCtx;
    }
});
