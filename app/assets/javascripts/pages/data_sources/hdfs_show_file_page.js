chorus.pages.HdfsShowFilePage = chorus.pages.Base.extend({
    constructorName: "HdfsShowFilePage",
    helpId: "hdfs_data_sources",

    setup:function (hdfsDataSourceId, id) {
        this.model = new chorus.models.HdfsEntry({ hdfsDataSource: {id: hdfsDataSourceId}, id: id });
        this.requiredResources.add(this.model);
        this.model.fetch();

        this.hdfsDataSource = new chorus.models.HdfsDataSource({id: hdfsDataSourceId});
        this.hdfsDataSource.fetch();

        this.handleFetchErrorsFor(this.hdfsDataSource);
        this.handleFetchErrorsFor(this.model);

        this.mainContent = new chorus.views.MainContentView({
            model:this.model,
            content:new chorus.views.ReadOnlyTextContent({model:this.model}),
            contentHeader:new chorus.views.HdfsShowFileHeader({ model:this.model }),
            contentDetails:new chorus.views.HdfsShowFileDetails({ model:this.model })
        });

        this.sidebar = new chorus.views.HdfsEntrySidebar({
            model: this.model
        });

        this.listenTo(this.hdfsDataSource, "loaded", this.render);
        this.listenTo(this.model, "serverResponded", this.render); // re-render when model is fetched even if it has errors

        this.breadcrumbs.requiredResources.add([this.model, this.hdfsDataSource]);
    },

    crumbs: function() {
        var pathLength = _.compact(this.model.getPath().split("/")).length - 1;

        var dataSourceCrumb = this.hdfsDataSource.get("name") + (pathLength > 0 ? " (" + pathLength + ")" : "");
        var fileNameCrumb = this.model.get("name");

        return [
            { label: t("breadcrumbs.home"), url: "#/" },
            { label: t("breadcrumbs.data_sources"), url: "#/data_sources" },
            { label: this.hdfsDataSource.loaded ? dataSourceCrumb : "…" , url: "#/hdfs_data_sources/" + this.hdfsDataSource.id + "/browse"},
            { label: this.model.loaded ? fileNameCrumb : "…"}
        ];
    },

    unprocessableEntity: function() {
        // Prevent default re-direct to unprocessable entity page
    },

    postRender: function() {
        var $content = $("<ul class='hdfs_link_menu'/>");

        var pathSegments = this.model.pathSegments();
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

    ellipsizePath: function() {
        var folders = this.path.split('/');
        if (folders.length > 3) {
            return "/" + folders[1] + "/…/" + folders[folders.length - 1];
        } else {
            return this.path;
        }
    }
});
