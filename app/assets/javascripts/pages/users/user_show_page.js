chorus.pages.UserShowPage = chorus.pages.Base.extend({
    helpId: "user",

    setup: function() {
        this.listenTo(this.model, "loaded", this.setupMainContent);
        this.handleFetchErrorsFor(this.model);
        this.breadcrumbs.requiredResources.add(this.model);
        this.model.fetch();
    },

    makeModel: function(userId) {
        this.model = new chorus.models.User({id: userId});
    },

    crumbs: function() {
        return [
            { label: t("breadcrumbs.home"), url: "#/" },
            { label: t("breadcrumbs.users"), url: "#/users" },
            { label: this.model.loaded ? this.model.displayShortName(20) : "…" }
        ];
    },

    setupMainContent: function() {
        this.mainContent = new chorus.views.MainContentView({
            model: this.model,
            content: new chorus.views.UserShow({model: this.model}),
            contentHeader: new chorus.views.DisplayNameHeader({ model: this.model, showTagBox: true }),
            contentDetails: new chorus.views.StaticTemplate("plain_action_bar", {text: t("users.details")})
        });
        this.setupSidebar();
        this.render();
    },

    setupSidebar: function() {
        this.sidebar = new chorus.views.UserSidebar({model: this.model});
    }
});
