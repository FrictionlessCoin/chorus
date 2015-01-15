chorus.views.SearchDataSource = chorus.views.SearchItemBase.extend({
    constructorName: "SearchDataSourceView",
    templateName: "search_data_source",

    setup: function() {
        this.additionalClass += " " + this.model.get("entityType");
    },

    additionalContext: function () {
        return _.extend(this._super("additionalContext"), {
            stateUrl: this.model.stateIconUrl(),
            stateText: this.model.stateText(),
            showUrl: this.model.showUrl(),
            iconUrl: this.model.providerIconUrl(),
            humanSize: I18n.toHumanSize(this.model.get("size"))
        });
    }
});