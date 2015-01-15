chorus.views.DataSourceItem = chorus.views.Base.include(
        chorus.Mixins.TagsContext
    ).extend({
    constructorName: "DataSourceItemView",
    templateName: "data_source_item",

    additionalContext: function() {
        return _.extend(this.additionalContextForTags(), {
            stateUrl: this.model.stateIconUrl(),
            stateText: this.model.stateText(),
            url: this.model.showUrl(),
            iconUrl: this.model.providerIconUrl()
        });
    }
});