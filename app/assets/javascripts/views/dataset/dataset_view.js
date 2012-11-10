chorus.views.Dataset = chorus.views.Base.extend({
    templateName: "dataset",
    tagName: "li",

    subviews: {
        ".comment .body": "commentBody"
    },

    setup: function() {
        this._super("setup", arguments);
        this.bindings.add(this.model, "invalidated", function() { this.model.fetch() }, this)
    },

    setupSubviews: function() {
        this.commentBody = new chorus.views.TruncatedText({
            model: this.model.lastComment(),
            attribute: "body",
            attributeIsHtmlSafe: true
        });
    },

    postRender: function() {
        this.$("a.instance, a.database").data("instance", this.model.instance().attributes);
        var $menu = this.$('.found_in .open_other_menu');
        chorus.menu($menu, {
            content: $menu.parent().find('.other_menu'),
            classes: "found_in_other_workspaces_menu"
        });

        if (!this.model.hasCredentials()) {
            $(this.el).addClass("no_credentials");
        }

        $(this.el).attr("data-database-object-id", this.model.id); // selenium handle
    },

    additionalContext: function() {
        var recentComment = this.model.lastComment();
        // For database objects that are not in workspaces, active workspace is undefined, but the dataset should be viewable
        var viewable = this.options.activeWorkspace !== false;


        var ctx = {
            dataset: this.model.asWorkspaceDataset(),
            showUrl: this.model.showUrl(),
            hasCredentials: this.model.hasCredentials(),
            iconImgUrl: this.model.iconUrl(),
            humanizedImportFrequency: chorus.helpers.importFrequencyForModel(this.model),
            workspaces: this.model.workspacesAssociated(),
            viewable: viewable,
            checkable: this.options.checkable
        };

        if (recentComment) {
            var date = Date.parseFromApi(recentComment.get("commentCreatedStamp"));
            ctx.lastComment = {
                body: recentComment.get("body"),
                creator: recentComment.author(),
                on: date && date.toString("MMM d")
            };
            ctx.otherCommentCount = parseInt(this.model.get("commentCount"), 10) - 1;
        }

        return ctx;
    }
});