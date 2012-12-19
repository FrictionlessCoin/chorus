chorus.pages.Bare = chorus.views.Bare.extend({
    bindCallbacks: function() {
        if (chorus.user) this.bindings.add(chorus.user, "change", this.render);
    },

    dependentResourceNotFound: function() {
        chorus.pageOptions = this.failurePageOptions();
        Backbone.history.loadUrl("/invalidRoute");
    },

    dependentResourceForbidden: function(model) {
        chorus.pageOptions = this.failurePageOptions();

        var error = model.serverErrors;
        if(error && error.type) {
            Backbone.history.loadUrl("/forbidden");
            return;
        }

        Backbone.history.loadUrl("/unauthorized");
    },

    unprocessableEntity: function(model) {
        var prefix = "unprocessable_entity.";
        if (model.serverErrors) {
            _.each(model.serverErrors, function(error, key) {
                if(key == 'record') {
                    var code = prefix + _.underscored(error);
                    chorus.pageOptions = {
                        title: t(code + ".title"),
                        text: t(code + ".text")
                    }
                } else {
                    chorus.pageOptions = {
                        title: t(prefix + "unidentified_error.title"),
                        text: error
                    }
                }
            })
        }

        Backbone.history.loadUrl("/unprocessableEntity");
    },

    dependOn: function(model, functionToCallWhenLoaded) {
        this.bindings.add(model, "resourceNotFound", this.dependentResourceNotFound);
        this.bindings.add(model, "resourceForbidden", _.bind(this.dependentResourceForbidden, this, model));
        this.bindings.add(model, "unprocessableEntity", _.bind(this.unprocessableEntity, this, model));
        this.bindings.add(model, "change", this.render);
        if (functionToCallWhenLoaded) {
            if (model.loaded) {
                functionToCallWhenLoaded.apply(this);
            } else {
                this.bindings.add(model, "loaded", functionToCallWhenLoaded);
            }
        }
    },

    failurePageOptions: function() {}
});

chorus.pages.Base = chorus.pages.Bare.extend({
    constructorName: "Page",
    templateName: "logged_in_layout",

    subviews: {
        "#header": "header",
        "#main_content": "mainContent",
        "#breadcrumbs": "breadcrumbs",
        "#sidebar .sidebar_content.primary": "sidebar",
        "#sidebar .sidebar_content.secondary": "secondarySidebar",
        "#sub_nav": "subNav"
    },

    setupSubviews: function() {
        this.header = this.header || new chorus.views.Header({ workspaceId: this.workspaceId });
        this.breadcrumbs = new chorus.views.BreadcrumbsView({
            breadcrumbs: _.isFunction(this.crumbs) ? this.crumbs() : this.crumbs
        });
    },

    showHelp: function(e) {
        e.preventDefault();
        chorus.help();
    }
})
