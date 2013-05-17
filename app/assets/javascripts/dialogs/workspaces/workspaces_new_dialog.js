chorus.dialogs.WorkspacesNew = chorus.dialogs.Base.extend({
    constructorName: "WorkspacesNew",

    templateName:"workspaces_new",
    title:"Create a New Workspace",

    persistent:true,

    events:{
        "keyup input[name=name]": "checkInput",
        "paste input[name=name]": "checkInput",
        "submit form.new_workspace":"createWorkspace"
    },

    makeModel:function () {
        this.model = this.model || new chorus.models.Workspace();
    },

    setup:function () {
        this.listenTo(this.resource, "saved", this.workspaceSaved);
        this.listenTo(this.resource, "saveFailed", function() { this.$("button.submit").stopLoading(); });
    },

    createWorkspace:function createWorkspace(e) {
        e.preventDefault();

        this.resource.set({
            name:this.$("input[name=name]").val().trim(),
            "public": !!this.$("input[name=public]").is(":checked")
        });

        this.$("button.submit").startLoading("actions.creating");
        this.resource.save();
    },

    workspaceSaved:function () {
        this.closeModal();
        chorus.router.navigate("/workspaces/" + this.model.get("id") + "/quickstart");
    },

    checkInput : function() {
        var hasText = this.$("input[name=name]").val().trim().length > 0;
        this.$("button.submit").prop("disabled", hasText ? false : "disabled");
    }
});
