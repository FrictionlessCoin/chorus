chorus.dialogs.Base = chorus.Modal.extend({
    constructorName: "Dialog",

    render: function() {
        if(this.hasBeenClosed) {
            return this;
        }

        this.preRender();

        var header = $("<div class='dialog_header'/>");
        var errors = $("<div class='errors hidden'/>");
        var content = $("<div class='dialog_content'/>");

        this.events = this.events || {};

        this.events["click .form_controls button.cancel"] = "closeModal";

        header.html($("<h1/>").text(_.result(this, 'title')));
        content.html(this.template(this.context()));
        content.attr("data-template", this.className);

// original
        $(this.el).
            empty().
            append(header).
            append(errors).
            append(content).
            addClass(this.className).
            addClass("dialog").
            addClass(this.additionalClass || "");

// new
        $(this.el).
            empty().
            append(header).
            append(content).
            addClass(this.className).
            addClass("dialog").
            addClass(this.additionalClass || "");
            
        this.delegateEvents();
        this.renderSubviews();
        this.renderHelps();
        this.postRender($(this.el));
        chorus.placeholder(this.$("input[placeholder], textarea[placeholder]"));

        return this;
    },

    modalClosed: function () {
        this._super("modalClosed");
        this.hasBeenClosed = true;
    },

    revealed: function () {
        $("#facebox").removeClass().addClass("dialog_facebox");
    },

    showDialogError : function(errorText) {
        var resource = this.resource || this.model;
        var serverErrors = resource.serverErrors || {};
        serverErrors.message = errorText;
        resource.serverErrors = serverErrors;
        this.displayServerErrors(resource);
    }
});
