chorus.handlebarsHelpers.dataset = {
    chooserMenu: function(choices, options) {
        options = options.hash;
        var max = options.max || 20;
        choices = choices || _.range(1, max + 1);
        options.initial = options.initial || _.last(choices);
        var selected = options.initial || choices[0];
        var translationKey = options.translationKey || "dataset.visualization.sidebar.category_limit";
        var className = options.className || '';

//         var markup = "<div class='limiter " + className + "'><span class='pointing_l'></span>" + t(translationKey) + " <a href='#'><span class='selected_value'>" + selected + "</span><span class='triangle'></span></a><div class='limiter_menu_container'><ul class='limiter_menu " + className + "'>";
        var markup = "<div class='limiter " + className + "'><span class='pointing_l'></span>" + t(translationKey) + " <a href='#'><span class='selected_value'>" + selected + "</span><span class='fa fa-caret-down'></span></a><div class='limiter_menu_container'><ul class='limiter_menu " + className + "'>";
        
        _.each(choices, function(thing) {
            markup = markup + '<li>' + thing + '</li>';
        });
        markup = markup + '</ul></div></div>';
        return new Handlebars.SafeString(markup);
    },

    sqlDefinition: function(definition) {
        if (!definition) {
            return '';
        }
        definition || (definition = '');
        var promptSpan = $('<span>').addClass('sql_prompt').text(t("dataset.content_details.sql_prompt")).outerHtml();
        var sqlSpan = $('<span>').addClass('sql_content').attr('title', definition).text(definition).outerHtml();
        return new Handlebars.SafeString(t("dataset.content_details.definition", {sql_prompt: promptSpan, sql: sqlSpan}));
    },

    datasetLocation: function(dataset, label) {
        var locationPieces = [];
        var dataSource;
        var dataSourceName;

        function locateDBDataset() {
            dataSource = dataset.dataSource();
            dataSourceName = dataSource.name();
            var schema = dataset.schema();
            var database = dataset.database();

            var databaseName = (database && Handlebars.helpers.withSearchResults(database).name()) || "";
            var schemaName = Handlebars.helpers.withSearchResults(schema).name();

            if (dataset.get('hasCredentials') === false) {
                locationPieces.push(dataSourceName);
                if (databaseName.toString()) {
                    locationPieces.push(databaseName);
                }
                locationPieces.push(schemaName);
            } else {
                locationPieces.push(Handlebars.helpers.linkTo(dataSource.showUrl(), dataSourceName, {"class": "data_source"}).toString());
                if (databaseName.toString()) {
                    locationPieces.push(Handlebars.helpers.linkTo(database.showUrl(), databaseName, {"class": "database"}).toString());
                }
                locationPieces.push(Handlebars.helpers.linkTo(schema.showUrl(), schemaName, {'class': 'schema'}).toString());
            }
        }

        function locateHdfsDataset() {
            dataSource = dataset.dataSource();
            dataSourceName = dataSource.name();
            locationPieces.push(Handlebars.helpers.linkTo(dataSource.showUrl(), dataSourceName, {"class": "data_source"}).toString());
        }

        if (dataset.get('entitySubtype') === 'HDFS') {
            locateHdfsDataset();
        } else {
            if (!dataset.schema()) return "";
            locateDBDataset();
        }

        label = _.isString(label) ? label : "dataset.from";
        var translation = t(label, {location: locationPieces.join('.')});
        return new Handlebars.SafeString($("<span></span>").html(translation).outerHtml());
    },

    humanizedDatasetType: function(dataset, statistics) {
        if (!dataset) { return ""; }
        var keys = ["dataset.entitySubtypes", dataset.entitySubtype];
        if (statistics instanceof chorus.models.DatasetStatistics && statistics.get("objectType")) {
            keys.push(statistics.get("objectType"));
        }
        else if (dataset.entitySubtype === "CHORUS_VIEW" || dataset.entitySubtype === "SOURCE_TABLE" || dataset.entitySubtype === "HDFS")
        {
            keys.push(dataset.objectType);
        }
        else if (dataset.entitySubtype === "SANDBOX_TABLE")
        {
            if (dataset.objectType === "TABLE") {
                keys.push("BASE_"+dataset.objectType);
            } else {
                keys.push(dataset.objectType);
            }
        }
        else {
            return t("loading");
        }
        var key = keys.join(".");
        return t(key);
    }
};

_.each(chorus.handlebarsHelpers.dataset, function(helper, name) {
    Handlebars.registerHelper(name, helper);
});
