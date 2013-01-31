chorus.pages.WorkfileIndexPage = chorus.pages.Base.extend({
    helpId: "workfiles",

    setup: function(workspaceId) {
        this.workspaceId = workspaceId;

        this.workspace = new chorus.models.Workspace({id: workspaceId});
        this.workspace.fetch();

        this.dependsOn(this.workspace);

        this.collection = new chorus.collections.WorkfileSet([], {workspaceId: workspaceId});
        this.collection.fileType = "";
        this.collection.sortAsc("fileName");
        this.collection.fetchAll();

        this.subNav = new chorus.views.SubNav({workspace: this.workspace, tab: "workfiles"});
        this.mainContent = new chorus.views.MainContentList({
            modelClass: "Workfile",
            collection: this.collection,
            model: this.workspace,
            title: t("workfiles.title"),
            checkable: true,
            contentDetailsOptions: { multiSelect: true },
            linkMenus: {
                type: {
                    title: t("header.menu.filter.title"),
                    options: [
                        {data: "", text: t("workfiles.header.menu.filter.all")},
                        {data: "SQL", text: t("workfiles.header.menu.filter.sql")},
                        {data: "CODE", text: t("workfiles.header.menu.filter.code")},
                        {data: "TEXT", text: t("workfiles.header.menu.filter.text")},
                        {data: "IMAGE", text: t("workfiles.header.menu.filter.image")},
                        {data: "OTHER", text: t("workfiles.header.menu.filter.other")}
                    ],
                    event: "filter"
                },
                sort: {
                    title: t("workfiles.header.menu.sort.title"),
                    options: [
                        {data: "alpha", text: t("workfiles.header.menu.sort.alphabetically")},
                        {data: "date", text: t("workfiles.header.menu.sort.by_date")}
                    ],
                    event: "sort"
                }
            },
            search: {
                placeholder: t("workfile.search_placeholder"),
                eventName: "workfile:search"
            }
        });
        chorus.PageEvents.subscribe("workfile:selected", this.setModel, this);

        this.multiSelectSidebarMenu = new chorus.views.MultipleSelectionSidebarMenu({
            selectEvent: "workfile:checked",
            actions: [
                '<a class="edit_tags">{{t "sidebar.edit_tags"}}</a>'
            ],
            actionEvents: {
                'click .edit_tags': _.bind(function() {
                    new chorus.dialogs.EditTags({collection: this.multiSelectSidebarMenu.selectedModels}).launchModal();
                }, this)
            }
        });

        this.mainContent.contentHeader.bind("choice:filter", function(choice) {
            this.collection.attributes.fileType = choice;
            this.collection.fetchAll();
        }, this);

        this.mainContent.contentHeader.bind("choice:sort", function(choice) {
            var field = choice === "alpha" ? "fileName" : "lastUpdatedStamp";
            this.collection.sortAsc(field);
            this.collection.fetchAll();
        }, this);

        this.bindings.add(this.workspace, "change", this.updateButtons);
        this.breadcrumbRequiredResources = [this.workspace];
    },

    crumbs: function() {
        return [
            {label: t("breadcrumbs.home"), url: "#/"},
            {label: t("breadcrumbs.workspaces"), url: '#/workspaces'},
            {label: this.workspace.loaded ? this.workspace.displayShortName() : "...", url: this.workspace.showUrl()},
            {label: t("breadcrumbs.workfiles.all")}
        ];
    },

    setModel: function(workfile) {
        this.model = workfile;
        if(this.sidebar) {
            this.sidebar.teardown(true);
        }
        this.sidebar = chorus.views.WorkfileSidebar.buildFor({model: this.model});
        this.renderSubview('sidebar');
    },

    updateButtons: function() {
        if (this.mainContent.model.canUpdate() && this.mainContent.model.isActive()) {
            this.mainContent.contentDetails.options.buttons = [
                {
                    view: "WorkfilesImport",
                    text: t("actions.import_workfile"),
                    dataAttributes: [
                        {
                            name: "workspace-id",
                            value: this.mainContent.model.get("id")
                        }
                    ]
                },
                {
                    view: "WorkfilesSqlNew",
                    text: t("actions.create_sql_workfile"),
                    dataAttributes: [
                        {
                            name: "workspace-id",
                            value: this.mainContent.model.get("id")
                        }
                    ]
                }
            ];
        }

        this.render();
    }
});
