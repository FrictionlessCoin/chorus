chorus.pages.WorkspaceDatasetIndexPage = chorus.pages.Base.extend({
    constructorName: "WorkspaceDatasetIndexPage",
    helpId: "datasets",

    setup: function(workspaceId) {
        this.collection = new chorus.collections.WorkspaceDatasetSet([], {workspaceId: workspaceId});
        this.collection.sortAsc("objectName");
        this.collection.fetch();
        this.handleFetchErrorsFor(this.collection);
        this.workspace.members().fetchIfNotLoaded();

        this.subscribePageEvent("dataset:selected", function(dataset) {
            this.model = dataset;
        });

        this.subscribePageEvent("csv_import:started", function() {
            this.collection.fetch();
        });

        this.listenTo(this.collection, 'searched', function() {
            this.mainContent.content.render();
            this.mainContent.contentFooter.render();
            this.mainContent.contentDetails.updatePagination();
        });

        var onTextChangeFunction = _.debounce(_.bind(function(e) {
            this.mainContent.contentDetails.startLoading(".count");
            this.collection.search($(e.target).val());
        }, this), 300);

        this.buildSidebar();

        this.subNav = new chorus.views.SubNav({workspace: this.workspace, tab: "datasets"});
        this.mainContent = new chorus.views.MainContentList({
            modelClass: "Dataset",
            collection: this.collection,
            model: this.workspace,
            useCustomList: true,
            title: t("dataset.title"),
            contentDetailsOptions: { multiSelect: true },
            search: {
                placeholder: t("workspace.search"),
                onTextChange: onTextChangeFunction
            },
            linkMenus: {
                type: {
                    title: t("header.menu.filter.title"),
                    options: [
                        {data: "", text: t("dataset.header.menu.filter.all")},
                        {data: "SOURCE_TABLE", text: t("dataset.header.menu.filter.source")},
                        {data: "CHORUS_VIEW", text: t("dataset.header.menu.filter.chorus_views")},
                        {data: "SANDBOX_DATASET", text: t("dataset.header.menu.filter.sandbox")}
                    ],
                    event: "filter"
                }
            },
            buttons: [
                {
                    view: "FileImport",
                    text: t("dataset.import.title"),
                    dataAttributes : [{name: 'workspace-id', value: this.workspace.get("id") }],
                    helpText: t("dataset.import.need_sandbox", {hereLink: '<a class="dialog" href="#" data-dialog="SandboxNew" data-workspace-id="'+this.workspace.get("id")+'">'+t("actions.click_here")+'</a>'}),
                    disabled: true
                }
            ]
        });

        this.mainContent.contentHeader.bind("choice:filter", function(choice) {
            this.collection.attributes.type = choice;
            this.collection.fetch();
        }, this);

        this.sidebar = new chorus.views.DatasetSidebar({ workspace: this.workspace, listMode: true });

        this.onceLoaded(this.workspace, this.workspaceLoaded);
        this.breadcrumbs.requiredResources.add(this.workspace);
    },

    // This prevents a 422 on a single dataset from redirecting the entire page.
    unprocessableEntity: $.noop,

    makeModel: function(workspaceId) {
        this.loadWorkspace(workspaceId);
    },

    crumbs: function() {
        return [
            {label: t("breadcrumbs.home"), url: "#/"},
            {label: t("breadcrumbs.workspaces"), url: '#/workspaces'},
            {label: this.workspace.displayShortName(), url: this.workspace.showUrl()},
            {label: t("breadcrumbs.workspaces_data")}
        ];
    },

    workspaceLoaded: function() {
        this.mainContent.contentHeader.options.sandbox = this.workspace.sandbox();
        this.render();

        var targetButton = this.mainContent.options.buttons[0];

        if (this.workspace.isActive()) {
            this.mainContent.content.options.hasActiveWorkspace = true;
        } else {
            this.mainContent.contentDetails.options.buttons = [];
        }

        if(this.workspace.sandbox()) {
            if(this.workspace.canUpdate()) {
                targetButton.dataAttributes.push({name: "canonical-name", value: this.workspace.sandbox().canonicalName()});
                targetButton.disabled = false;
                delete targetButton.helpText;
            } else {
                this.mainContent.contentDetails.options.buttons = [];
            }

            this.dataSource = this.workspace.sandbox().dataSource();
            this.account = this.workspace.sandbox().dataSource().accountForCurrentUser();

            this.listenTo(this.account, "loaded", this.checkAccount);

            this.account.fetchIfNotLoaded();
        } else {
            var loggedInUser = chorus.session.user();

            if(loggedInUser.get("id") !== this.workspace.get("owner").id && !loggedInUser.get("admin")) {
                targetButton.helpText = t("dataset.import.need_sandbox_no_permissions");
            }
        }
        this.mainContent.contentDetails.render();
        this.onceLoaded(this.workspace.members(), this.setSidebarActions);
    },

    checkAccount: function() {
        if (!this.dataSource.isShared() && !this.account.get('id')) {
            if (!chorus.session.sandboxPermissionsCreated[this.workspace.get("id")]) {
                this.dialog = new chorus.dialogs.WorkspaceDataSourceAccount({model: this.account, pageModel: this.workspace});
                this.dialog.launchModal();
                this.account.bind('saved', function() {
                    this.collection.fetch();
                }, this);
                chorus.session.sandboxPermissionsCreated[this.workspace.get("id")] = true;
            }
        }
    },

    sidebarMultiselectActions: function () {
        var actions = [
            '<a class="edit_tags">{{t "sidebar.edit_tags"}}</a>'
        ];

        if (chorus.models.Config.instance().get("workFlowConfigured") && this.workspace.currentUserCanCreateWorkFlows()) {
            actions.push('<a class="new_work_flow">{{t "sidebar.new_work_flow"}}</a>');
        }
        return actions;
    },

    sidebarMultiselectActionEvents: function () {
        return {
            'click .edit_tags': _.bind(function () {
                new chorus.dialogs.EditTags({collection: this.multiSelectSidebarMenu.selectedModels}).launchModal();
            }, this),
            'click .new_work_flow': _.bind(function () {
                new chorus.dialogs.WorkFlowNewForDatasetList({workspace: this.workspace, collection: this.multiSelectSidebarMenu.selectedModels}).launchModal();
            }, this)
        };
    },

    buildSidebar: function () {
        this.multiSelectSidebarMenu = new chorus.views.MultipleSelectionSidebarMenu({
            selectEvent: "dataset:checked",
            actions: this.sidebarMultiselectActions(),
            actionEvents: this.sidebarMultiselectActionEvents()
        });
    },

    setSidebarActions: function () {
        this.multiSelectSidebarMenu.setActions(this.sidebarMultiselectActions());
    }
});
