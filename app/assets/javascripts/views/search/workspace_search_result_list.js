(function() {
    var viewConstructorMap = {
        workfile:                   chorus.views.SearchWorkfile,
        linked_tableau_workfile:    chorus.views.SearchWorkfile,
        dataset:                    chorus.views.SearchDataset,
        chorusView:                 chorus.views.SearchDataset,
        workspace:                  chorus.views.SearchWorkspace,
        attachment:                 chorus.views.SearchAttachment
    };

    chorus.views.WorkspaceSearchResultList = chorus.views.SearchResultList.extend({
        constructorName: "WorkspaceSearchResultList",

        title: function() {
            return t("search.type.this_workspace", { name: this.search.workspace().get("name") });
        },

        makeListItemView: function(model) {
            var viewConstructor = viewConstructorMap[model.get("entityType")];
            return new viewConstructor({ model: model, search: this.search });
        },

        showAll: function(e) {
            e.preventDefault();
            this.search.set({ searchIn: "this_workspace" });
            chorus.router.navigate(this.search.showUrl());
        }
    });
})();
