chorus.views.HdfsEntrySidebar = chorus.views.Sidebar.extend({
    constructorName: "HdfsEntrySidebar",
    templateName: "hdfs_entry_sidebar",

    subviews: {
        '.tab_control': 'tabs'
    },

    events : {
        'click .external_table': 'createExternalTable',
        'click .directory_external_table': "openDirectoryExternalTable",
        "click .edit_tags": "startEditingTags",
        "click .add_note": "launchNotesNewDialog",
        "click .new_work_flow": "launchWorkFlowNewDialog"
    },

    setup: function() {
        this.subscribePageEvent("hdfs_entry:selected", this.setEntry);
        this.subscribePageEvent("csv_import:started", this.refreshActivities);
        this.tabs = new chorus.views.TabControl(["activity"]);
    },

    refreshActivities: function() {
        this.tabs.activity && this.tabs.activity.collection.fetch();
    },

    postRender: function() {
        this._super("postRender");
        if (this.resource && this.resource.get("isDir")) {
            this.$(".tab_control").addClass("hidden");
            this.$(".tabbed_area").addClass("hidden");
        } else {
            this.$(".tab_control").removeClass("hidden");
            this.$(".tabbed_area").removeClass("hidden");
        }
    },

    setEntry: function(entry) {
        this.resource && this.stopListening(this.resource, "unprocessableEntity");
        this.resource = entry;
        if (entry) {
            entry.entityId = this.resource.id;

            if (this.tabs.activity ) {
                delete this.tabs.activity ;
            }

            if (!entry.get("isDir")) {
                var activities = entry.activities();
                activities.fetch();

                this.listenTo(activities, "changed", this.render);
                this.listenTo(activities, "reset", this.render);

                this.tabs.activity = new chorus.views.ActivityList({
                    collection: activities,
                    additionalClass: "sidebar",
                    type: t("hdfs." + (entry.get("isDir") ? "directory" : "file"))
                });
            }
        } else {
            delete this.tabs.activity;
        }

        this.listenTo(this.resource, "unprocessableEntity", function() {
            var record = this.resource.serverErrors.record;
            chorus.toast("record_error." + record);
        });

        this.render();
    },

    additionalContext: function() {
        return new chorus.presenters.HdfsEntrySidebar(this.resource, this.options);
    },

    createExternalTable: function(e) {
        e && e.preventDefault();

        this.resource.fetch();

        this.listenTo(this.resource, "loaded", this.launchCreateExternTableDialog);
    },

    launchCreateExternTableDialog: function() {
        this.stopListening(this.resource, 'loaded', this.launchCreateExternTableDialog);
        var hdfsDataSource = new chorus.models.HdfsDataSource({id: this.options.hdfsDataSourceId});
        var externalTable = new chorus.models.HdfsExternalTable({
            path: this.resource.get('path'),
            hdfsDataSourceId: hdfsDataSource.get('id'),
            hdfs_entry_id: this.resource.get('id')
        });

        var dialog = new chorus.dialogs.CreateExternalTableFromHdfs({
            model: externalTable,
            csvOptions: {
                tableName: this.resource.name(),
                contents: this.resource.get('contents')
            }
        });
        dialog.launchModal();
    },

    launchNotesNewDialog: function(e) {
        e && e.preventDefault();
        var dialogOptions = {
            pageModel: this.resource,
            entityId: this.resource.id,
            entityType: "hdfs_file",
            allowWorkspaceAttachments: false,
            displayEntityType: t("hdfs.file_lower")
        };

        var dialog = new chorus.dialogs.NotesNew(dialogOptions);
        dialog.launchModal();
    },

    openDirectoryExternalTable: function(e) {
        e.preventDefault();
        new chorus.dialogs.HdfsDataSourceWorkspacePicker({model: this.resource, activeOnly: true}).launchModal();
    },

    startEditingTags: function(e) {
        e.preventDefault();
        new chorus.dialogs.EditTags({collection: new chorus.collections.Base([this.resource])}).launchModal();
    },

    launchWorkFlowNewDialog: function(e) {
        e && e.preventDefault();
        var dialog = new chorus.dialogs.HdfsWorkFlowWorkspacePicker({
            hdfsEntries: new chorus.collections.HdfsEntrySet([this.resource])
        });
        dialog.launchModal();
    }
});
