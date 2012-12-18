chorus.collections.InstanceAccountSet = chorus.collections.Base.extend({
    constructorName: "InstanceAccountSet",
    model: chorus.models.InstanceAccount,
    urlTemplate: "gpdb_instances/{{instanceId}}/members",

    users: function() {
        return this.map(function(model) {
            return model.user();
        });
    },

    urlParams: function() {
        return {
            instanceId: this.attributes.instanceId
        }
    },

    comparator: function(account) {
        var name = account.user() && (account.user().get("lastName") + account.user().get("firstName"));
        name = name ? name.toLowerCase() : '\uFFFF'  //'FFFF' should be the last possible unicode character
        return name;
    },

    persistedAccountCount: function() {
        return _.compact(this.pluck('id')).length;
    }
});