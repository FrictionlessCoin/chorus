chorus.dialogs.InstanceEdit = chorus.dialogs.Base.extend({
    constructorName: "InstanceEdit",

    templateName: "instance_edit",
    title: t("instances.edit_dialog.title"),
    events: {
        "submit form": "save"
    },

    makeModel: function() {
        this.sourceModel = this.options.launchElement.data("instance")
        this.model = new chorus.models[this.sourceModel.constructorName](this.sourceModel.attributes);
    },

    setup: function() {
        this.bindings.add(this.model, "saved", this.saveSuccess);
        this.bindings.add(this.model, "saveFailed", this.saveFailed);
        this.bindings.add(this.model, "validationFailed", this.saveFailed);
    },

    additionalContext: function() {
        return {
            registeredInstance: this.model.get("provisionType") == "register",
            provisionedInstance: this.model.get("provisionType") == "create",
            hadoopInstance: this.model.constructorName == "HadoopInstance"
        };
    },

    save: function(e) {
        e.preventDefault();
        var attrs = {
            description: this.$("textarea[name=description]").val().trim(),
            provisionType: this.model.get("provisionType")
        };

        _(["name", "host", "port", "size", "maintenanceDb", "username", "groupList"]).each(function(name) {
            var input = this.$("input[name=" + name + "]")
            if (input) {
                attrs[name] = input.val() &&  input.val().trim();
            }
        }, this)

        this.$("button.submit").startLoading("instances.edit_dialog.saving");
        this.$("button.cancel").prop("disabled", true);
        this.model.save(attrs, {silent: true});
    },

    saveSuccess: function() {
        this.sourceModel.set(this.model.attributes);
        chorus.toast("instances.edit_dialog.saved_message");
        this.closeModal();
    },

    saveFailed: function() {
        this.$("button.submit").stopLoading();
        this.$("button.cancel").prop("disabled", false);
    }
});
