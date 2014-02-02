chorus.views.Login = chorus.views.Base.extend({
    constructorName: "LoginView",
    templateName:"login",
    events:{
        "submit form":"submitLoginForm"
    },

    persistent:true,

    setup:function () {
        this.listenTo(this.model, "saved", this.onLogin);
    },

    additionalContext: function() {
        return {
            alpineBranded: chorus.models.Config.instance().get('alpineBranded'),
            currentYear: moment().year()
        };
    },

    postRender : function() {
        this.$(".legal .version").load("/VERSION" + "?buster=" + chorus.cachebuster(), function(response) {
            $(this).text(response.slice(0, 19));
            $(this).attr('title', "Version " + response);
        });
        _.defer(_.bind(function() { this.$("input[name='username']").focus(); }, this));
    },

    onLogin : function () {
        var targetDestination;

        if (chorus.session && chorus.session.shouldResume()) {
            targetDestination = chorus.session.resumePath();
        } else {
            targetDestination = "/";
        }

        chorus.router.navigate(targetDestination);
    },

    submitLoginForm:function submitLoginForm(e) {
        e.preventDefault();

        this.model.clear({ silent:true });
        delete this.model.id;
        this.model.set({
            username:this.$("input[name='username']").val(),
            password:this.$("input[name='password']").val()
        });
        this.model.save();
    }
});
