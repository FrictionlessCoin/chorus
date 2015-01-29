chorus.pages.HdfsEntryIndexPage = chorus.pages.Base.include(
    chorus.Mixins.HdfsViews
).extend({
    helpId: "instances",
    constructorName: 'HdfsEntryIndex',

    failurePageOptions: function() {
        return {
            title: t('invalid_route.hdfs_entry_index.title'),
            text: t('invalid_route.hdfs_entry_index.content')
        };
    },

    setupMultiSelectSidebar: function() {
        this.multiSelectSidebarMenu = new chorus.views.MultipleSelectionSidebarMenu({
            selectEvent: "hdfs_entry:checked",
            actionProvider: [{name: "edit_tags", target: chorus.dialogs.EditTags}]
        });
    },

    setup: function(hdfsDataSourceId, id) {
        this.dataSource = new chorus.models.HdfsDataSource({ id: hdfsDataSourceId });
        this.dataSource.fetch();
        this.hdfsDataSourceId = hdfsDataSourceId;

        this.hdfsEntry = new chorus.models.HdfsEntry({
            id: id,
            hdfsDataSource: {
                id: hdfsDataSourceId
            }
        });
        this.hdfsEntry.fetch();

        this.handleFetchErrorsFor(this.hdfsEntry);

        this.collection = new chorus.collections.HdfsEntrySet([], {
            hdfsDataSource: {
                id: this.hdfsDataSourceId
            }
        });

        this.mainContent = new chorus.views.MainContentList({
            contentHeader: new chorus.views.HdfsEntryHeader({dataSource: this.dataSource, hdfsEntry: this.hdfsEntry}),
            modelClass: "HdfsEntry",
            collection: this.collection,
            useCustomList: true,
            contentDetailsOptions: { multiSelect: true }
        });

        this.buildPrimaryActionPanel();
        this.sidebar = new chorus.views.HdfsEntrySidebar();

        this.listenTo(this.dataSource, 'loaded', this.setupMultiSelectSidebar);
        this.listenTo(this.dataSource, "loaded", this.dataSourceFetched);
        this.subscribePageEvent("hdfs_entry:selected", this.entrySelected);

        this.listenTo(this.hdfsEntry, "loaded", this.entryFetched);
    },

    crumbs: function() {
        var path = this.hdfsEntry.get("path") || "";
        var pathLength = _.compact(path.split("/")).length + 1;
        var modelCrumb = this.dataSource.get("name") + (pathLength > 0 ? " (" + pathLength + ")" : "");
        return [
            { label: t("breadcrumbs.home"), url: "#/" },
            { label: t("breadcrumbs.data_sources"), url: "#/data_sources" },
            { label: this.dataSource.loaded ? modelCrumb : "…" }
        ];
    },

    dataSourceFetched: function() {
        if(this.hdfsEntry.loaded) {
            this.render();
        }
    },

    entryFetched: function() {
        this.collection.reset(this.hdfsEntry.get("entries"));

        this.entrySelected(this.collection.at(0));

        this.collection.loaded = true;

        if(this.dataSource.loaded) {
            this.render();
        }
    },

    postRender: function() {
        if (this.path === "/") {
            return;
        }

        var $content = $("<ul class='hdfs_link_menu'/>");

        var pathSegments = this.hdfsEntry.pathSegments();
        var maxLength = 20;

        _.each(pathSegments, function(hdfsEntry) {
            var link = $("<a></a>").attr('href', hdfsEntry.showUrl()).text(_.truncate(hdfsEntry.get('name'), maxLength));
            $content.append($("<li></li>").append(link));
        });

        this.menu(this.$(".breadcrumb").eq(2), {
            content: $content,

            qtipArgs: {
                show: { event: "mouseenter"},
                hide: { event: "mouseleave", delay: 500, fixed: true }
            }
        });
    },

    entrySelected : function(model) {
        this.model = model;
    },

    buildPrimaryActionPanel: function() {
        var actions = [ {name: 'add_data', target: chorus.dialogs.HdfsImportDialog} ];
        this.primaryActionPanel = new chorus.views.PrimaryActionPanel({actions: actions, pageModel: this.hdfsEntry});
    }
});
