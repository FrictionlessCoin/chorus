chorus.handlebarsHelpers.time = {
    displayTimestamp: function(timestamp) {
        var date = Date.parseFromApi(timestamp);
        return date ? date.toString("MMMM d") : "";
    },

    relativeTimestamp: function(timestamp) {
        var date = Date.parseFromApi(timestamp);
        return date ? date.toRelativeTime(60000) : "";
    }
};

_.each(chorus.handlebarsHelpers.time, function(helper, name) {
    Handlebars.registerHelper(name, helper);
});