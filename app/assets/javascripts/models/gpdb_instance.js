chorus.models.GpdbInstance = chorus.models.DataSource.extend({
    constructorName: "GpdbInstance",
    urlTemplate: "data_sources/{{id}}",
    nameAttribute: 'name',
    entityType: "gpdb_instance",

    showUrlTemplate: "instances/{{id}}/databases",

    parameterWrapper: "data_source",

    defaults: {
        type: 'GREENPLUM'
    },

    declareValidations: function(newAttrs) {
        this.require("name", newAttrs);
        this.requirePattern("name", chorus.ValidationRegexes.MaxLength64(), newAttrs);

        this.require("host", newAttrs);
        this.require("port", newAttrs);
        this.require("maintenanceDb", newAttrs);
        this.requirePattern("port", chorus.ValidationRegexes.OnlyDigits(), newAttrs);
        if (this.isNew()) {
            this.require("dbUsername", newAttrs);
            this.require("dbPassword", newAttrs);
        }
    },

    databases: function() {
        this._databases || (this._databases = new chorus.collections.DatabaseSet([], {instanceId: this.get("id")}));
        return this._databases;
    },

    accounts: function() {
        this._accounts || (this._accounts = new chorus.collections.InstanceAccountSet([], {instanceId: this.get("id")}));
        return this._accounts;
    },

    accountForUser: function(user) {
        return new chorus.models.InstanceAccount({ instanceId: this.get("id"), userId: user.get("id") });
    },

    accountForCurrentUser: function() {
        if (!this._accountForCurrentUser) {
            this._accountForCurrentUser = this.accountForUser(chorus.session.user());
            this._accountForCurrentUser.bind("destroy", function() {
                delete this._accountForCurrentUser;
                this.trigger("change");
            }, this);
        }
        return this._accountForCurrentUser;
    },

    accountForOwner: function() {
        var ownerId = this.get("owner").id;
        return _.find(this.accounts().models, function(account) {
            return account.get("owner").id === ownerId;
        });
    },

    attrToLabel: {
        "dbUsername": "instances.dialog.database_account",
        "dbPassword": "instances.dialog.database_password",
        "name": "instances.dialog.instance_name",
        "host": "instances.dialog.host",
        "port": "instances.dialog.port",
        "databaseName": "instances.dialog.database_name",
        "maintenanceDb": "instances.dialog.maintenance_db",
        "description": "instances.dialog.description"
    },

    isShared: function() {
        return !!this.get("shared");
    },

    usage: function() {
        if (!this.instanceUsage) {
            this.instanceUsage = new chorus.models.InstanceUsage({ instanceId: this.get('id')});
        }
        return this.instanceUsage;
    },

    isGreenplum: function() {
        return true;
    },

    hasWorkspaceUsageInfo: function() {
        return !this.isHadoop() && this.usage().has("workspaces");
    },

    sharing: function() {
        if (!this._sharing) {
            this._sharing = new chorus.models.InstanceSharing({instanceId: this.get("id")});
        }
        return this._sharing;
    },

    sharedAccountDetails: function() {
        return this.accountForOwner() && this.accountForOwner().get("dbUsername");
    }
});
