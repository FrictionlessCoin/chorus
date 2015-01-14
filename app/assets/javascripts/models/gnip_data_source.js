chorus.models.GnipDataSource = chorus.models.AbstractDataSource.extend({
    constructorName: "GnipDataSource",
    urlTemplate: "gnip_data_sources/{{id}}",
    showUrlTemplate: "gnip_data_sources/{{id}}",
    shared: true,
    entityType: "gnip_data_source",
    parameterWrapper: "gnip_data_source",

    isShared: function() {
        return true;
    },

    isGnip: function() {
        return true;
    },

    stateText: function() {
        return 'Online';
    },

    stateIconUrl: function() {
        return this._imagePrefix + 'green.svg';
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
