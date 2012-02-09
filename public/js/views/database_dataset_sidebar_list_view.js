chorus.views.DatabaseDatasetSidebarList = chorus.views.DatabaseSidebarList.extend({
    className:"database_dataset_sidebar_list",
    useLoadingSection:true,

    events:_.extend({}, chorus.views.DatabaseSidebarList.prototype.events, {
        "click li a":"datasetSelected"
    }),

    fetchResourceAfterSchemaSelected:function (schema) {
        this.resource = this.collection = new chorus.collections.Base();

        this.tables = this.schema.tables();
        this.views = this.schema.views();
        this.tables.bind("reset", datasetFetchComplete, this);
        this.views.bind("reset", datasetFetchComplete, this);
        this.tables.fetchAll();
        this.views.fetchAll();

        function datasetFetchComplete(tableOrViewSet) {
            this.collection.add(tableOrViewSet.models, {silent:true});
            this.render();
        }
    },

    datasetSelected:function (e) {
        e.preventDefault();
        var li = $(e.currentTarget).closest("li"),
            type = li.data("type"),
            name = li.data("name");

        var dataset = this.collection.findWhere({ type:type, objectName:name });
        this.trigger("datasetSelected", dataset);
    },

    additionalContext:function () {
        this.collection.models.sort(function (a, b) {
            return naturalSort(a.get("objectName").toLowerCase(), b.get("objectName").toLowerCase());
        });

        return this._super("additionalContext", arguments);
    },

    collectionModelContext:function (model) {
        return {
            type:model.get("type"),
            name:model.get("objectName"),
            cid:model.cid
        }
    },

    displayLoadingSection:function () {
        return !(this.tables && this.tables.loaded && this.views && this.views.loaded);
    }
});


