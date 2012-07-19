chorus.dialogs.PickWorkspace = chorus.dialogs.PickItems.extend({
    constructorName: "PickWorkspace",

    title: t("dataset.associate.title.one"),
    constructorName: "PickWorkspaceDialog",
    submitButtonTranslationKey: "dataset.associate.button.one",
    emptyListTranslationKey: "dataset.associate.empty.placeholder",
    searchPlaceholderKey: "dataset.associate.search",
    selectedEvent: 'files:selected',
    modelClass: "Workspace",

    setup: function() {
        this._super("setup");
    },

    additionalContext: function() {
        var ctx = this._super("additionalContext", arguments);

        return _.extend(ctx, {
            serverErrors: this.serverErrors
        });
    },

    makeModel: function() {
        this.pageModel = this.options.pageModel;
        this.collection = this.collection || this.defaultWorkspaces();
        this.collection.fetchAll();
    },

    defaultWorkspaces: function() {
        if (this.options.activeOnly) {
            return chorus.session.user().activeWorkspaces();
        }
        return chorus.session.user().workspaces();
    },

    collectionModelContext: function(model) {
        return {
            name: model.name(),
            imageUrl: model.defaultIconUrl("small")
        };
    }
});
