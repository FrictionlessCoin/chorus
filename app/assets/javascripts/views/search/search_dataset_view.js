chorus.views.SearchDataset = chorus.views.SearchItemBase.extend({
    constructorName: "SearchDatasetView",
    templateName: "search_dataset",
    eventType: 'dataset',

    additionalContext: function() {
        var context = {
            dataset: this.model.asWorkspaceDataset(),
            showUrl: this.model.showUrl(),
            iconUrl: this.model.iconUrl(),
            tags: this.model.tags().models
        };

        var workspaces;
        if (this.model.get("workspaces")) {
            context.workspaces = this.model.get("workspaces");
        } else if (this.model.get("workspace")) {
            context.workspaces = [this.model.get("workspace")];
        }

        return context;
    },

    postRender: function() {
        this._super("postRender");

        this.$("a.instance, a.database").data("instance", this.model.get("instance"));
        chorus.menu(this.$(".location .found_in a.open_other_menu"), {
            content: this.$(".other_menu"),
            classes: "found_in_other_workspaces_menu"
        });
    }
});
