// @version 5
// NO LONGER IN USE
// applies to an older version of chorus

chorus.views.Dashboard = chorus.views.Base.extend({
    constructorName: "DashboardView",
    templateName:"dashboard/main",
    subviews: {
        '.dashboard_main': "dashboardMain",
        '.data_source_list': "dataSourceList",
        '.workspace_list': "workspaceList",
        '.project_list': "projectList",
        '.modular_dashboard': "modularDashboard"
    },

    setup: function() {
        this.memberWorkspaces = new chorus.collections.WorkspaceSet();
        this.memberWorkspaces.attributes = _.extend({}, this.collection.attributes);
        this.memberWorkspaces.attributes.userId = chorus.session.user().id;

        this.projectWorkspaces = new chorus.collections.WorkspaceSet();
        this.projectWorkspaces.attributes = _.extend({}, this.collection.attributes);

        this.workspaceList = new chorus.views.MainContentView({
            collection: this.memberWorkspaces,
            contentHeader: new chorus.views.StaticTemplate("default_content_header", {title:t("header.workspaces")}),
            contentDetails:new chorus.views.StaticTemplate("dashboard/workspace_list_content_details"),
            content:new chorus.views.DashboardWorkspaceList({ collection: this.memberWorkspaces })
        });

        this.projectList = new chorus.views.MainContentView({
            collection: this.projectWorkspaces,
            contentHeader: new chorus.views.ProjectListHeader({collection: this.projectWorkspaces}),
            content: new chorus.views.DashboardProjectList({ collection: this.projectWorkspaces })
        });

        this.dataSourceList = new chorus.views.MainContentView({
            collection: this.options.dataSourceSet,
            contentHeader: new chorus.views.StaticTemplate("default_content_header", {title:t("header.browse_data")}),
            contentDetails: new chorus.views.StaticTemplate("dashboard/data_source_list_content_details"),
            content: new chorus.views.DashboardDataSourceList({ collection: this.options.dataSourceSet })
        });

        this.modularDashboard = new chorus.views.ModularDashboard();

        var activities = new chorus.collections.ActivitySet([]);

        activities.fetch();
        this.activityList = new chorus.views.ActivityList({ collection: activities, additionalClass: "dashboard" });
        this.dashboardMain = new chorus.views.MainContentView({
            content: this.activityList,
            contentHeader: new chorus.views.ActivityListHeader({
                collection: activities,
                allTitle: t("dashboard.title.activity"),
                insightsTitle: t("dashboard.title.insights")
            })
        });

        if (this.collection.loaded) {
            this.collectionUpdated();
        }
        this.listenTo(this.collection, 'loaded', this.collectionUpdated);
    },

    collectionUpdated: function () {
        this.memberWorkspaces.loaded = true;
        this.projectWorkspaces.loaded = true;
        this.memberWorkspaces.reset(this.collection.where({isMember: true}));
        this.memberWorkspaces.trigger('loaded');
        this.projectWorkspaces.reset(this.collection.where({isProject: true}));
        this.projectWorkspaces.trigger('loaded');
    }
});

