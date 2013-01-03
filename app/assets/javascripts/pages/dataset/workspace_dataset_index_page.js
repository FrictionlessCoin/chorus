chorus.pages.WorkspaceDatasetIndexPage = chorus.pages.Base.extend({
    constructorName: "WorkspaceDatasetIndexPage",
    helpId: "datasets",

    setup: function(workspaceId) {
        this.workspaceId = workspaceId;
        this.workspace = new chorus.models.Workspace({id: workspaceId});
        this.workspace.fetch();
        this.bindings.add(this.workspace, "loaded", this.entriesFetched);
        this.dependOn(this.workspace, this.workspaceLoaded);

        this.collection = new chorus.collections.WorkspaceDatasetSet([], {workspaceId: workspaceId});
        this.collection.sortAsc("objectName");
        this.collection.fetch();
        this.dependOn(this.collection);

        chorus.PageEvents.subscribe("dataset:selected", function(dataset) {
            this.model = dataset;
        }, this);

        chorus.PageEvents.subscribe("csv_import:started", function() {
            this.collection.fetch();
        }, this);

        this.bindings.add(this.collection, 'searched', function() {
            this.mainContent.content.render();
            this.mainContent.contentFooter.render();
            this.mainContent.contentDetails.updatePagination();
        });

        var onTextChangeFunction = _.debounce(_.bind(function(e) {
            this.mainContent.contentDetails.startLoading(".count");
            this.collection.search($(e.target).val());
        }, this), 300);

        this.subNav = new chorus.views.SubNav({workspace: this.workspace, tab: "datasets"});
        this.mainContent = new chorus.views.MainContentList({
            modelClass: "Dataset",
            collection: this.collection,
            model: this.workspace,
            title: t("dataset.title"),
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
                    view: "DatasetImport",
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
    },

    entriesFetched: function() {
        this.mainContent.contentHeader.options.sandbox = this.workspace.sandbox();
        this.render();
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
        this.render();

        var targetButton = this.mainContent.options.buttons[0];

        if (this.workspace.isActive()) {
            this.mainContent.content.options.activeWorkspace = true;
        } else {
            this.mainContent.contentDetails.options.buttons = [];
        }

        if (!this.workspace.canUpdate()) {
            this.mainContent.contentDetails.options.buttons = [];
            this.mainContent.contentDetails.render();
        } else if (this.workspace.sandbox()) {
            targetButton.dataAttributes.push({name: "canonical-name", value: this.workspace.sandbox().canonicalName()});
            targetButton.disabled = false;
            delete targetButton.helpText;
            this.mainContent.contentDetails.render();
            this.instance = this.workspace.sandbox().instance();
            this.account = this.workspace.sandbox().instance().accountForCurrentUser();

            this.bindings.add(this.account, "loaded", this.checkAccount);
            this.mainContent.contentDetails.render();

            this.account.fetchIfNotLoaded();
        } else {
            var loggedInUser = chorus.session.user();

            if (loggedInUser.get("id") !== this.workspace.get("owner").id &&
                !loggedInUser.get("admin"))
            {
                targetButton.helpText = t("dataset.import.need_sandbox_no_permissions");
                this.mainContent.contentDetails.render();
            }
        }
    },

    checkAccount: function() {
        if (!this.instance.isShared() && !this.account.get('id')) {
            if (!chorus.session.sandboxPermissionsCreated[this.workspace.get("id")]) {
                this.dialog = new chorus.dialogs.WorkspaceInstanceAccount({model: this.account, pageModel: this.workspace});
                this.dialog.launchModal();
                this.account.bind('saved', function() {
                    this.collection.fetch();
                }, this);
                chorus.session.sandboxPermissionsCreated[this.workspace.get("id")] = true;
            }
        }
    }
});
