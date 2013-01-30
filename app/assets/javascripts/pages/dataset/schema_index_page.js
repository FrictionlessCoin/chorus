chorus.pages.SchemaIndexPage = chorus.pages.Base.include(
    chorus.Mixins.InstanceCredentials.page
).extend({
    constructorName: "SchemaIndexPage",
    helpId: "instances",

    setup: function(databaseId) {
        this.database = new chorus.models.Database({id: databaseId});
        this.collection = this.database.schemas();

        this.database.fetch();
        this.collection.fetchAll();

        this.dependsOn(this.database);
        this.dependsOn(this.collection);

        this.mainContent = new chorus.views.MainContentList({
            modelClass: "Schema",
            collection: this.collection,
            title: _.bind(this.database.name, this.database),
            imageUrl: "/images/data_sources/greenplum_database.png",
            search: {
                selector: ".name",
                placeholder: t("schema.search_placeholder"),
                eventName: "schema:search"
            }
        });

        this.sidebar = new chorus.views.SchemaListSidebar();

        this.updateBreadcrumbsAfterLoading(this.database);
    },

    crumbs: function() {
        return [
            { label: t("breadcrumbs.home"), url: "#/" },
            { label: t("breadcrumbs.instances"), url: "#/data_sources" },
            { label: this.database.instance().name(), url: this.database.instance().showUrl() },
            { label: this.database.name() }
        ];
    }
});
