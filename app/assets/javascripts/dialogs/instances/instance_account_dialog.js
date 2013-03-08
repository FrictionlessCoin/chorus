chorus.dialogs.InstanceAccount = chorus.dialogs.Account.extend({
    constructorName: "InstanceAccount",

    translationKeys: {
        cancel: 'actions.cancel',
        body: 'instances.account.enter_credentials'
    },

    setup: function() {
        this.title = this.options.title;
    },

    makeModel: function(options) {
        var instance = this.options.instance;
        this.model = instance.accountForCurrentUser();
        this._super("makeModel", arguments);
    },

    modalClosed: function() {
        this._super("modalClosed", arguments);
        if(this.options.reload && this.savedSuccessfully) {
            chorus.router.reload();
        }
        if(this.options.goBack && !this.savedSuccessfully) {
            window.history.back();
        }
    },

    saved: function() {
        this.savedSuccessfully = true;
        this._super('saved');
    }
});
