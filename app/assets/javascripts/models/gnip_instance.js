chorus.models.GnipInstance = chorus.models.Instance.extend({
    constructorName: "GnipInstance",
    urlTemplate: "gnip_instances/{{id}}",
    showUrlTemplate: "gnip_instances/{{id}}",
    shared: true,
    entityType: "gnip_instance",
    parameterWrapper: "gnip_instance",

    providerIconUrl: function() {
        return this._imagePrefix + "icon_datasource_gnip.png"
    },

    isShared: function() {
        return true;
    },

    isGnip: function() {
        return true;
    },

    declareValidations: function(newAttrs) {
        this.require("name", newAttrs);
        this.requirePattern("name", chorus.ValidationRegexes.MaxLength64(), newAttrs);
        this.require("streamUrl", newAttrs);
        this.require("username", newAttrs);

        if (!this.get('id')) {
            this.require("password", newAttrs);
        }
    },

    sharedAccountDetails: function() {
        return this.get("username");
    }

});
