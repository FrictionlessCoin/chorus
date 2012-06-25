chorus.models.TypeAheadSearchResult = chorus.models.SearchResult.extend({
    constructorName: "TypeAheadSearchResult",
    urlTemplate: "search/typeAhead/",

    results: function() {
        var typeAhead = this.get('typeAhead');

        if (!typeAhead) { return []; }

        return _.compact(_.map(typeAhead.docs, function(result) {
            switch (result.entityType) {
                case "user":
                    return new chorus.models.User(result);
                    break;
                case "workspace":
                    return new chorus.models.Workspace(result);
                    break;
                case "workfile":
                    return new chorus.models.Workfile(result);
                    break;
                case "hdfs":
                    return new chorus.models.HdfsEntry(result);
                    break;
                case "dataset":
                    return new chorus.models.Dataset(result);
                    break;
                case "chorusView":
                    return new chorus.models.ChorusView(result);
                    break;
                case "instance":
                    return new chorus.models.GreenplumInstance(result);
                    break;
                default:
                    break;
            }
        }));
    }
});
