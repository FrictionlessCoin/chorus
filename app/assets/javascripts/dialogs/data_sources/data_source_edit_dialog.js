chorus.dialogs.DataSourceEdit = chorus.dialogs.Base.extend({
    constructorName: "DataSourceEdit",

    templateName: "data_source_edit",
    title: t("data_sources.edit_dialog.title"),
    events: {
        "submit form": "save"
    },

    formFields: ["name", "host", "port", "size", "dbName", "username", "groupList", "streamUrl", "password", "jobTrackerHost", "jobTrackerPort", "hdfsVersion"],

    makeModel: function() {
        this.sourceModel = this.model;
        this.model = this.model.clone();
    },

    setup: function() {
        this.listenTo(this.model, "saved", this.saveSuccess);
        this.listenTo(this.model, "saveFailed", this.saveFailed);
        this.listenTo(this.model, "validationFailed", this.saveFailed);
    },

    postRender: function() {
        this.$(".hdfs_version").val(this.model.get("hdfsVersion"));
        _.defer(_.bind(function() {
            chorus.styleSelect(this.$("select.hdfs_version"), { format: function(text, option) {
                var aliasedName = $(option).attr("name");
                return '<span class='+ aliasedName +'></span>' + text;
            } });
        }, this));
    },

    additionalContext: function() {
        return {
            gpdbOrOracleDataSource: this.model.get("entityType") === "gpdb_data_source" || this.model.get("entityType") === "oracle_data_source",
            hdfsDataSource: this.model.constructorName === "HdfsDataSource",
            gnipDataSource: this.model.constructorName === "GnipDataSource"
        };
    },

    save: function(e) {
        e.preventDefault();
        var attrs = {
            description: this.$("textarea[name=description]").val().trim()
        };

        _.each(this.formFields, function(name) {
            var input = this.$("input[name=" + name + "], select[name=" + name + "]");
            if (input.length) {
                attrs[name] = input.val().trim();
            }
        }, this);

        this.$("button.submit").startLoading("data_sources.edit_dialog.saving");
        this.$("button.cancel").prop("disabled", true);
        this.model.save(attrs, {silent: true});
    },

    saveSuccess: function() {
        this.sourceModel.set(this.model.attributes);
        chorus.toast("data_sources.edit_dialog.saved_message");
        this.closeModal();
    }
});
