chorus.dialogs.NameChorusView = chorus.dialogs.Base.extend({
    constructorName: "AssignChorusViewName",
    templateName: "name_chorus_view",
    title: t("dataset.name_chorus_view.title"),

    events: {
        "keyup input[name=objectName]": "checkInput",
        "paste input[name=objectName]": "checkInput",
        "submit form": "nameChorusView"
    },

    setup: function() {
        this.listenTo(this.model, "saved", this.chorusViewCreated);
        this.listenTo(this.model, "saveFailed", this.chorusViewFailed);
        this.listenTo(this.model, "validationFailed", this.chorusViewFailed);
    },

    nameChorusView: function(e) {
        e.preventDefault();

        this.model.set({ objectName: this.$("input[name=objectName]").val().trim() });
        this.$("button.submit").startLoading("actions.creating");
        this.model.save();
    },

    chorusViewCreated: function() {
        $(document).trigger("close.facebox");
        chorus.router.navigate(this.model.showUrl());
    },

    chorusViewFailed: function() {
        this.$("button.submit").stopLoading();
    },

    checkInput: function() {
        var hasText = this.$("input[name=objectName]").val().trim().length > 0;
        this.$("button.submit").prop("disabled", !hasText);
    }
});
