chorus.models.InstanceAccount = chorus.models.Base.extend({
    constructorName: "InstanceAccount",
    parameterWrapper: "account",
    paramsToIgnore: ['owner'],

    urlTemplate: function(options) {
        var method = options && options.method;
        var isEditingOwnAccount = this.get("userId") === chorus.session.user().id;

        if (isEditingOwnAccount) {
            return "data_sources/{{instanceId}}/account";
        }

        if (method === "update" || method === "delete") {
            return "data_sources/{{instanceId}}/members/{{id}}";
        }

        return "data_sources/{{instanceId}}/members";
    },

    user: function() {
        return this.get("owner") && new chorus.models.User(this.get('owner'));
    },

    declareValidations: function(newAttrs) {
        this.require('dbUsername', newAttrs);

        if (this.isNew() || (newAttrs && newAttrs.hasOwnProperty('dbPassword'))) {
            this.require('dbPassword', newAttrs);
        }
    },

    attrToLabel: {
        "dbUsername": "instances.permissions.username",
        "dbPassword": "instances.permissions.password"
    }
}, {
    findByInstanceId: function(instanceId) {
        var account = new chorus.models.InstanceAccount({ instanceId: instanceId });
        account.fetch();
        return account;
    }
});
