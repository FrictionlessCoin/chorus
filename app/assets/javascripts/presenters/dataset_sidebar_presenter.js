chorus.presenters.DatasetSidebar = chorus.presenters.Base.extend({
    setup: function() {
        _.each(this.options, function(value, key) {
            this[key] = value;
        }, this);
    },

    typeString: function() {
        return Handlebars.helpers.humanizedDatasetType(this.resource && this.resource.attributes, this.resource && this.resource.statistics());
    },

    deleteMsgKey: function() {
        return this.deleteKey("deleteMsgKey");
    },

    deleteTextKey: function() {
        return this.deleteKey("deleteTextKey");
    },

    deleteKey: function(target) {
        var keyTable = {
            "CHORUS_VIEW": {
                deleteMsgKey: "chorus_view",
                deleteTextKey: "actions.delete"
            },
            "SOURCE_TABLE_VIEW":{
                deleteMsgKey: "view",
                deleteTextKey: "actions.delete_association"
            },
            "SOURCE_TABLE":{
                deleteMsgKey: "table",
                deleteTextKey: "actions.delete_association"
            },
            "HDFS": {
                deleteMsgKey: "hdfs_dataset",
                deleteTextKey: "actions.delete"
            }
        };

        var resourceType = this.resource && this.resource.get("entitySubtype");
        var resourceObjectType = this.resource && this.resource.get("objectType");

        var rescue = {};
        rescue[target] = "";
        var deleteMsgKey = (keyTable[resourceType + "_" + resourceObjectType] || keyTable[resourceType] || rescue)[target];

        return deleteMsgKey || "";
    },

    canAssociate: function() {
        return !(this.resource.isChorusView() || this.resource.isHdfsDataset() || this.resource.workspaceArchived());
    },

    isDeleteable: function() {
        return !this.options.searchPage && this.hasWorkspace() && this.resource.isDeleteable() && this.resource.workspace().canUpdate();
    },

    realWorkspace: function() {
        // this.workspace gets overriden by options hash passed by pages
        return this.options.searchPage ? null : this.resource.workspace();
    },

    workspaceId: function() {
        return this.hasWorkspace() && this.resource.workspace().id;
    },

    currentUserCanCreateWorkFlow: function () {
        return this.workFlowsEnabled() &&
          !this.isChorusView() &&
          this.hasWorkspace() &&
          this.resource.workspace().currentUserCanCreateWorkFlows() &&
          !this.noValidCredentials();
    },

    currentUserCanDuplicateChorusViews: function() {
        return this.resource.workspace().currentUserCanDuplicateChorusViews();
    },

    importsEnabled: function() {
        return !!(this.hasWorkspace() && this.resource.workspace().sandbox() && !(this.resource.isHdfsDataset() || this.resource.isJdbc()) && !this.resource.get('stale'));
    },

    hasWorkspace: function() {
        return this.resource && this.realWorkspace();
    },

    inProgressText: function() {
        var destination = this.resource && this.resource.lastImport() && this.resource.lastImport().destination();
        var source = this.resource && this.resource.lastImport() && this.resource.lastImport().source();

        if(!destination) return "";
        var importStringKey;
        var tableLink = this._linkToModel(source);
        var lastImport = this.resource.lastImport();

        var sourceDataset = lastImport.get('sourceDataset');
        if(sourceDataset && sourceDataset.id === this.resource.get('id')) {
            importStringKey = "import.in_progress";
            tableLink = destination.id ? this._linkToModel(destination) : destination.name();
        } else {
            importStringKey = "import.in_progress_into";
        }

        return Handlebars.helpers.unsafeT(importStringKey, { tableLink: tableLink });
    },

    importInProgress: function() {
        var lastImport = this.resource && this.resource.lastImport();
        return lastImport && lastImport.isInProgress();
    },

    importFailed: function() {
        var lastImport = this.resource && this.resource.lastImport();

        return lastImport && !this.importInProgress() && !lastImport.get('success');
    },

    lastImport: function () {
        var lastImport = this.resource && this.resource.lastImport();
        var importStatusKey, tableLink;

        if(!lastImport) {
            return "";
        }

        if(lastImport.isInProgress()) {
            var startedAt = Handlebars.helpers.relativeTimestamp(lastImport.get('startedStamp'));
            return Handlebars.helpers.unsafeT("import.began", { timeAgo: startedAt });
        }

        var sourceDataset = lastImport.get("sourceDataset");
        if(sourceDataset && sourceDataset.id === this.resource.get("id")) {
            var destination = lastImport.destination();
            tableLink = destination.id ? this._linkToModel(destination) : this.ellipsize(destination.name());

            if(lastImport.get('success')) {
                importStatusKey = "import.last_imported";
            } else {
                importStatusKey = "import.last_import_failed";
            }
        } else {
            var source = lastImport.source();
            tableLink = (lastImport.get("fileName")) ?
                Handlebars.helpers.spanFor(this.ellipsize(lastImport.get("fileName")), { 'class': "source_file", title: lastImport.get("fileName") }) :
                source.get("id") ? this._linkToModel(source) : source.get("objectName");
            if(lastImport.get('success')) {
                importStatusKey = "import.last_imported_into";
            } else {
                importStatusKey = "import.last_import_failed_into";
            }
        }

        var completedAt = Handlebars.helpers.relativeTimestamp(lastImport.get('completedStamp'));
        return Handlebars.helpers.unsafeT(importStatusKey, { timeAgo: completedAt, tableLink: tableLink });
    },

    noCredentialsWarning: function() {
        if(!this.resource) {
            return "";
        }

        var addCredentialsLink = Handlebars.helpers.linkTo("#", t("dataset.credentials.missing.linkText"), {'class': 'add_credentials'});
        var dataSourceName = this.resource.dataSource().name();
        return Handlebars.helpers.unsafeT("dataset.credentials.missing.body", {linkText: addCredentialsLink, dataSourceName: dataSourceName });
    },

    noCredentials: function() {
        return this.resource ? !this.resource.hasCredentials() : "";
    },

    noValidCredentials: function() {
        return this.noCredentials() || this.invalidCredentials();
    },
    invalidCredentials: function() {
        return this.resource && this.resource.invalidCredentials;
    },

    invalidCredentialsMsg: function() {
        var plainMsg = Handlebars.helpers.unsafeT("dataset.credentials.invalid.body", {
            dataSourceName: this.resource.dataSource().name()
        });
        var linkMsg = plainMsg + " " + Handlebars.helpers.unsafeT("dataset.credentials.invalid.updateCredentials", {
            linkText: Handlebars.helpers.linkTo("#", t("dataset.credentials.invalid.linkText"), {'class': 'update_credentials'})
        });

        if(chorus.models.DataSourceAccount.currentUserCanUpdateCredentialsFor(this.resource.dataSource())) {
            return linkMsg;
        } else {
            return plainMsg;
        }
    },

    isChorusView: function() {
        return this.resource ? this.resource.isChorusView() : "";
    },

    isHdfsDataset: function() {
        return this.resource ? this.resource.isHdfsDataset() : "";
    },

    hasDataSourceAccount: function() {
        return !!this.resource.dataSource().accountForCurrentUser().id;
    },

    displayEntityType: function() {
        return this.resource ? this.resource.metaType() : "";
    },

    workspaceArchived: function() {
        return this.resource && this.resource.workspaceArchived();
    },

    canAnalyze: function() {
        return this.resource && this.resource.canAnalyze();
    },

    canImport: function() {
        return this.resource && this.resource.isOracle();
    },

    hasImport: function() {
        return this.resource && this.resource.hasImport();
    },

    canExport: function() {
        return !this.options.searchPage && this.resource && this.resource.canExport() && !this.noValidCredentials();
    },

    _linkToModel: function(model) {
        return Handlebars.helpers.linkTo(model.showUrl(), this.ellipsize(model.name()), {title: model.name()});
    },

    ellipsize: function (name) {
        if (!name) return "";
        var length = 15;
        return (name.length < length) ? name : name.slice(0, length-3).trim() + "…";
    }
});
