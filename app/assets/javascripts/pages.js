chorus.pages.Bare = chorus.views.Bare.extend({
    bindCallbacks: function() {
        if (chorus.user) this.listenTo(chorus.user, "change", this.render);
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
        } else if (error && error.license) {
            Backbone.history.loadUrl("/notLicensed");
        } else {
            Backbone.history.loadUrl("/unauthorized");
        }
    },

    unprocessableEntity: function(model) {
        chorus.pageOptions = this.failurePageOptions();

        var errors = model.serverErrors;
        if (errors) {
            var undefinedErrorTitle = "unprocessable_entity.unidentified_error.title";
            if(errors.record) {
                var code = "record_error." + errors.record;
                var title = I18n.lookup(code + "_title");
                chorus.pageOptions = {
                    title: title ? title : t(undefinedErrorTitle),
                    text: t(code, errors),
                    message: errors.message
                };
            } else {
                chorus.pageOptions = {
                    title: t(undefinedErrorTitle),
                    text: errors.message
                };
            }
        }

        Backbone.history.loadUrl("/unprocessableEntity");
    },

    handleFetchErrorsFor: function(resource) {
        this.listenTo(resource, "resourceNotFound", this.dependentResourceNotFound);
        this.listenTo(resource, "resourceForbidden", _.bind(this.dependentResourceForbidden, this, resource));
        this.listenTo(resource, "unprocessableEntity", _.bind(this.unprocessableEntity, this, resource));
    },

    failurePageOptions: function() {}
});

chorus.pages.Base = chorus.pages.Bare.extend({
    constructorName: "Page",
    templateName: "logged_in_layout",

    subviews: {
        "#header": "header",
        "#main_content": "mainContent",
        "#page_sub_header": "subHeader",
        "#breadcrumbs": "breadcrumbs",
        "#sub_nav": "subNav",
        "#sidebar .primary_action_panel": "primaryActionPanel",
        "#sidebar .multiple_selection": "multiSelectSidebarMenu",
        "#sidebar .sidebar_content.primary": "sidebar",
        "#sidebar .sidebar_content.secondary": "secondarySidebar"
    },

    // Load a workspace for a page into page.workspace, fetch and set as a requiredResource based on options
    loadWorkspace: function(workspaceId, options) {
        var optionsWithDefaults = _.extend({
            fetch: true,
            required: false
        }, options);
        this.workspaceId = parseInt(workspaceId, 10);
        this.workspace = new chorus.models.Workspace({id: workspaceId});
        if (optionsWithDefaults.fetch) {
            this.handleFetchErrorsFor(this.workspace);
            this.workspace.fetch();
        }
        if (optionsWithDefaults.required) {
            this.requiredResources.add(this.workspace);
        }
    },

    setupBreadcrumbs: function () {
        var page = this;
        this.breadcrumbs = new chorus.views.BreadcrumbsView({
            breadcrumbs: _.isFunction(page.crumbs) ? _.bind(page.crumbs, page) : page.crumbs
        });
    },

    hasSubHeader: function() {
//         console.log ("pages.js>hasSubHeader - > " + !!this.workspaceId + " | " + this.workspaceId);
        // currently this hack allows for the page subheader only on places where workspaceId has a value
        // so wont work on people page, etc.
        return !!this.workspaceId;
    },

    setupSubHeader: function () {
        this.additionalClass = "workspace";
        this.subHeader = new chorus.views.SubHeader({model: this.workspace});
    },

    _initializeHeaderAndBreadcrumbs: function() {
        this.header = this.header || new chorus.views.Header();
        this.header.workspaceId = this.workspaceId;

        _.result(this, "hasSubHeader") ? this.setupSubHeader() : this.setupBreadcrumbs();
    }
});
