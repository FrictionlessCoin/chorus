(function() {
    var collectionMap = {
        hdfs_entries: "HdfsEntrySet",
        datasets: "DatasetSet",
        workfiles: "WorkfileSet",
        workspaces: "WorkspaceSet",
        workspaceItems: "WorkspaceItemSet",
        data_sources: "DataSourceSet",
        users: "UserSet",
        other_files: "AttachmentSet"
    };

    function makeCollectionMethod(methodName) {
        var constructorName = collectionMap[methodName];
        var collection, memoizedName = "_" + methodName;

        return function() {
            var ctor = chorus.collections.Search[constructorName];
            var searchKey = ctor.prototype.searchKey;

            if (!this[memoizedName]) {
                collection = this[memoizedName] = new ctor([], { search: this });
                collection.loaded = true;
                if (this.get(searchKey)){
                    collection.refreshFromSearch();
                }
            }

            return this[memoizedName];
        };
    }

    chorus.models.SearchResult = chorus.models.Base.extend({
        constructorName: "SearchResult",
        numResultsPerPage: 50,

        initialize: function() {
            this.bind('invalidated', function() {
                this.selectedItem.trigger('invalidated');
            });
        },

        urlTemplate: function() {
            if (this.isScopedToSingleWorkspace()) {
                return "workspaces/{{workspaceId}}/search/";
            } else if (this.isScopedToUserWorkspaces()) {
                return "search/workspaces/";
            } else {
                return "search/";
            }
        },

        currentPageNumber: function() {
            return this.get("page") || 1;
        },

        showUrlTemplate: function() {
            var prefix = "",
                workspaceId = this.get("workspaceId");

            if (workspaceId) {
                prefix = "workspaces/" + workspaceId + "/";
            }

            if (this.get("isTag")) {
                prefix += "tags/";
            } else {
                prefix += "search/";
            }

            if (this.isConstrained()) {
                return prefix + this.searchIn() + "/" + this.entityType() + "/" + encodeURIComponent(this.get("query"));
            } else {
                return prefix + encodeURIComponent(this.get("query"));
            }
        },

        download: function(options) {
            this.selectedItem.download(options);
        },

        name: function() {
            return this.selectedItem.name();
        },

        isScoped: function() {
            return this.isScopedToSingleWorkspace() || this.isScopedToUserWorkspaces();
        },

        isConstrained: function() {
            return this.isScoped() || this.hasSpecificEntityType();
        },

        isScopedToSingleWorkspace: function() {
            return this.searchIn() === "this_workspace";
        },

        isScopedToUserWorkspaces: function() {
            return this.searchIn() === "my_workspaces";
        },

        isPaginated: function() {
            return this.hasSpecificEntityType() || this.isScopedToSingleWorkspace();
        },

        hasSpecificEntityType: function() {
            return this.entityType() && (this.entityType() !== "all");
        },

        entityType: function() {
            return this.get("entityType") || "all";
        },

        searchIn: function() {
            return this.get("searchIn") || "all";
        },

        urlParams: function() {
            var params = { query: this.get("query") };

            if(this.get("isTag")){
                params.tag = true;
            }
            if (this.hasSpecificEntityType()) {
                params.entityType = this.entityType();
            }
            if (this.has("workspaceId")) {
                params.workspaceId = this.get("workspaceId");
            }
            if (this.isPaginated()) {
                params.per_page = this.numResultsPerPage;
                params.page = this.currentPageNumber();
            } else {
                params.per_type = 3;
            }
            return params;
        },

        displayShortName: function(length) {
            length = length || 20;

            var name = this.get("query") || "";
            return (name.length < length) ? name : name.slice(0, length) + "…";
        },

        workspace: function() {
            var workspaceId = this.get("workspaceId");
            if (!this._workspace && workspaceId) {
                this._workspace = new chorus.models.Workspace({ id: workspaceId });
            }
            return this._workspace;
        },

        workfiles: makeCollectionMethod("workfiles"),
        datasets: makeCollectionMethod("datasets"),
        workspaces: makeCollectionMethod("workspaces"),
        dataSources: makeCollectionMethod("data_sources"),
        users: makeCollectionMethod("users"),
        hdfs_entries: makeCollectionMethod("hdfs_entries"),
        workspaceItems: makeCollectionMethod("workspaceItems"),
        attachments: makeCollectionMethod("other_files"),

        getResults: function() {
            if (this.isScopedToSingleWorkspace()) {
                return this.workspaceItems();
            }

            switch(this.entityType()) {
            case "user":
                return this.users();
            case "workspace":
                return this.workspaces();
            case "workfile":
                return this.workfiles();
            case "dataset":
                return this.datasets();
            case "data_source":
                return this.dataSources();
            case "hdfs_entry":
                return this.hdfs_entries();
            case "attachment":
                return this.attachments();
            }
        },

        numPages: function(totalFound) {
            return Math.ceil(totalFound / this.numResultsPerPage);
        },

        total: function() {
            return _.reduce(_.values(this.attributes), function(sum, results) {
                if (results && results.numFound) {
                    return sum + results.numFound;
                } else {
                    return sum;
                }
            }, 0);
        }
    });
})();
