chorus.models.WorkspaceDataset = chorus.models.Dataset.extend({
    constructorName: "WorkspaceDataset",

    urlTemplate: function(options) {
        if(options && options.download) {
            return this._super("urlTemplate", arguments);
        } else {
            return "workspaces/{{workspace.id}}/datasets/{{id}}";
        }
    },

    showUrlTemplate: "workspaces/{{workspace.id}}/datasets/{{id}}",

    isChorusView: function() {
        return this.get("type") === "CHORUS_VIEW";
    },

    iconUrl: function() {
        var result = this._super("iconUrl", arguments);
        if (this.get('hasCredentials') === false) {
            result = result.replace(".png", "_locked.png");
        }
        return result;
    },

    query: function() {
        return this.get("query") || this.get("content");
    },

    isSandbox: function() {
        return this.get("type") == "SANDBOX_TABLE";
    },

    deriveChorusView: function() {
        var chorusView = new chorus.models.ChorusView({
            sourceObjectId: this.id,
            schemaId: this.schema().id,
            name: this.get("objectName")
        });
        chorusView.sourceObject = this;
        return chorusView;
    },

    createDuplicateChorusView: function() {
        var attrs = _.extend({},  this.attributes, {
            objectName: t("dataset.chorusview.copy_name", { name: this.get("objectName") }),
            instanceId: this.get("instance").id,
            sourceObjectId: this.id
        });
        delete attrs.id;
        return new chorus.models.ChorusView(attrs);
    },

    statistics: function() {
        var stats = this._super("statistics")

        if (this.isChorusView() && !stats.datasetId) {
            stats.set({ workspace: this.get("workspace")})
            stats.datasetId = this.get("id")
        }

        return stats;
    },

    getImport: function() {
        if (!this._datasetImport) {
            this._datasetImport = new chorus.models.DatasetImport({
                datasetId: this.get("id"),
                workspaceId: this.get("workspace").id
            });
        }
        return this._datasetImport
    },

    setImport: function(datasetImport) {
        this._datasetImport = datasetImport;
    },

    importFrequency: function() {
        if (this.getImport().loaded) {
            if (this.getImport().hasActiveSchedule()) { return this.getImport().frequency(); }
        } else {
            return this.get("importFrequency");
        }
    },

    columns: function(options) {
        var result = this._super('columns', arguments);
        result.attributes.workspaceId = this.get("workspace").id;
        return result;
    },

    hasOwnPage: function() {
        return true;
    },

    lastImportSource: function() {
        var importInfo = this.get("importInfo");
        if (importInfo && importInfo.sourceId) {
            return new chorus.models.WorkspaceDataset({
                id: importInfo.sourceId,
                objectName: importInfo.sourceTable,
                workspaceId: this.get("workspace").id
            });
        }
    },

    canBeImportSource: function() {
        return !this.isSandbox();
    },

    canBeImportDestination: function() {
        return true;
    },

    setWorkspace: function(workspace) {
        this.set({workspace: {id: workspace.get('id')}});
    },

    activities: function() {
        var original = this._super("activities", arguments);
        if (this.isChorusView()) {
            original.attributes.workspace = this.get("workspace");
        }

        return original;
    }
});
