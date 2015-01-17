chorus.dialogs.DataSourcePermissions = chorus.dialogs.Base.extend({
    constructorName: "DataSourcePermissions",

    templateName: "data_source_permissions",
    title: t("data_sources.permissions_dialog.title"),
    additionalClass: 'with_sub_header',
    persistent: true,

    events: {
        "click a.edit": "editCredentials",
        "click a.save": "save",
        "click a.cancel": "cancel",
        "click button.add_account": "newAccount",
        "click a.add_shared_account": "addSharedAccountAlert",
        "click a.change_owner": "changeOwner",
        "click a.remove_shared_account": "removeSharedAccountAlert",
        "click a.make_owner": "confirmChangeOwnerFromIndividualAccount",
        "click a.save_owner": "confirmChangeOwnerFromSharedAccount",
        "click a.cancel_change_owner": "cancelChangeOwner",
        "click a.remove_credentials": "confirmRemoveCredentials"
    },

    makeModel: function() {
        this._super("makeModel", arguments);
        this.model = this.dataSource = this.options.dataSource;

        this.ownership = new chorus.models.DataSourceOwnership({dataSourceId: this.dataSource.id});
        this.users = new chorus.collections.UserSet();
        this.listenTo(this.users, "reset", this.populateSelect);
        this.users.sortAsc("firstName");
        this.users.fetchAll();
        this.collection = this.dataSource.accounts();

        this.listenTo(this.collection, "reset", this.render);
        this.listenTo(this.collection, "add", this.render);
        this.listenTo(this.collection, "saved", this.saved);
        this.listenTo(this.collection, "saveFailed", this.saveFailed);
        this.listenTo(this.collection, "validationFailed", this.saveFailed);

    },

    additionalContext: function(context) {
        return {
            sharedAccount: this.dataSource.isShared(),
            accountCount: this.collection.reject(
                function(account) {
                    return account.isNew();
                }).length
        };
    },

    collectionModelContext: function(account) {
        var context = {};
        var user = account.user();
        if (user) {
            _.extend(context, {
                fullName: user.displayName(),
                imageUrl: user.fetchImageUrl(),
                isOwner: this.dataSource.isOwner(account.user())
            });
        }
        if (account.isNew()) {
            context.id = 'new';
            context.isNew = true;
        }
        return context;
    },

    postRender: function() {
        this.populateSelect();
        this.$("form").bind("submit", _.bind(this.save, this));
    },

    editCredentials: function(event) {
        event.preventDefault();
        this.cancel();
        this.clearErrors();
        var li = $(event.target).closest("li");
        var accountId = li.data("id");
        li.addClass("editing");
        this.account = this.collection.get(accountId);
    },

    cancelChangeOwner: function(e) {
        e.preventDefault();
        var ownerId = this.dataSource.accountForOwner().get("id");
        var ownerLi = this.$("li[data-id=" + ownerId + "]");
        ownerLi.find("div.name").removeClass("hidden");
        ownerLi.find("a.change_owner").removeClass("hidden");
        ownerLi.find("a.edit").removeClass("hidden");
        ownerLi.find("a.save_owner").addClass("hidden");
        ownerLi.find(".select_container").addClass("hidden");
        ownerLi.find("a.cancel_change_owner").addClass("hidden");
        ownerLi.find(".links .owner").removeClass("hidden");
    },

    changeOwner: function(e) {
        if (e) e.preventDefault();
        var ownerId = this.dataSource.accountForOwner().get("id");
        var ownerLi = this.$("li[data-id=" + ownerId + "]");
        ownerLi.find("div.name").addClass("hidden");
        ownerLi.find("a.change_owner").addClass("hidden");
        ownerLi.find("a.save_owner").removeClass("hidden");
        ownerLi.find("a.cancel_change_owner").removeClass("hidden");
        ownerLi.find("a.edit").addClass("hidden");
        ownerLi.find(".links .owner").addClass("hidden");
        ownerLi.find(".select_container").removeClass("hidden");
        chorus.styleSelect(ownerLi.find("select.name"));
    },

    confirmChangeOwnerFromIndividualAccount: function(e) {
        e.preventDefault();
        var accountId = $(e.target).closest("li").data("id");
        var selectedUser = this.collection.get(accountId).user();
        this.confirmChangeOwner(selectedUser);
    },

    confirmChangeOwnerFromSharedAccount: function(e) {
        e.preventDefault();
        var selectedUserId = this.$("select.name").val();
        var selectedUser = this.users.get(selectedUserId);
        this.confirmChangeOwner(selectedUser);
    },

    confirmChangeOwner: function(newOwner) {
        var confirmAlert = new chorus.alerts.DataSourceChangedOwner({ model: newOwner });
        confirmAlert.bind("confirmChangeOwner", this.saveOwner, this);
        this.launchSubModal(confirmAlert);
    },

    saveOwner: function(user) {
        var newOwnerId = user.get("id");
        this.listenTo(this.ownership, "saveFailed", function() { this.showErrors(this.ownership); });
        this.listenTo(this.ownership, "saved", function() {
            chorus.toast("data_sources.confirm_change_owner.toast");
            this.closeModal();
            this.collection.fetch({
                success: _.bind(function() {
                    this.dataSource.set({ owner: { id: newOwnerId } });
                    this.dataSource.trigger("invalidated");
                }, this)
            });
        });

        this.ownership.save({ id: newOwnerId });
    },

    newAccount: function(e) {
        var button = this.$("button.add_account");
        if (button.is(":disabled")) return;
        this.account = new chorus.models.DataSourceAccount({dataSourceId: this.dataSource.get("id")});
        this.collection.add(this.account);
        this.$("button.add_account").prop("disabled", true);
        var newLi = this.$("li[data-id=new]");
        newLi.addClass('editing new');
        newLi.find("div.name").addClass("hidden");

        this.populateNewAccountSelect();

        newLi.find(".select_container").removeClass("hidden");
        chorus.styleSelect(newLi.find("select.name"));
    },

    populateSelect: function() {
        if (this.dataSource.isShared()) {
            this.populateOwnerSelect();
        } else {
            this.populateNewAccountSelect();
        }
    },

    populateOwnerSelect: function() {
        var options = this.users.map(function(user) {
            return $("<option/>").text(user.displayName()).val(user.get("id")).outerHtml();
        });
        var select = this.$("select.name");
        select.empty();
        if (select) {
            select.append(options.join(""));
        }
        select.val(this.dataSource.owner().get("id"));
        this.updateUserSelect();
        $('li[data-id=new] select').change(_.bind(this.updateUserSelect, this));
    },

    populateNewAccountSelect: function() {
        var collectionUserSet = new chorus.collections.UserSet(this.collection.users());
        var otherUsers = this.users.select(function(user) {
            return !collectionUserSet.get(user.get("id"));
        });

        var select = this.$("li.new select.name");
        select.attr('id', 'select_new_data_source_account_owner'); // need handle for Selenium to interact with JQ Select
        select.empty();
        if (select) {
            select.append(_.map(otherUsers,
                function(user) {
                    var escapedDisplayName = Handlebars.Utils.escapeExpression(user.displayName());
                    return $("<option/>").text(escapedDisplayName).val(user.get("id")).outerHtml();
                }).join(""));
        }
        this.updateUserSelect();
        $('li[data-id=new] select').change(_.bind(this.updateUserSelect, this));
    },

    updateUserSelect: function() {
        var selectedUser = this.users.get($('li[data-id=new] select').val());
        if (selectedUser) {
            this.$('li[data-id=new] img.profile').attr('src', selectedUser.fetchImageUrl());
        }
    },

    save: function(event) {
        event.stopPropagation();
        event.preventDefault();
        var li = $(event.target).closest("li");
        li.find("a.save").startLoading("data_sources.permissions.saving");

        this.listenTo(this.account, "validationFailed", function() {
            this.showErrors(this.account);
        });
        this.listenTo(this.account, "saveFailed", function() {
            this.showErrors(this.account);
        });
        this.account.save({
            ownerId: li.find("select").val(),
            dbUsername: li.find("input[name=dbUsername]").val(),
            dbPassword: li.find("input[name=dbPassword]").val()
        });
    },

    modalClosed: function() {
        this.cancel();
        this._super('modalClosed');
    },

    cancel: function(event) {
        if (event) {
            event.preventDefault();
        }
        this.$("button.add_account").prop("disabled", false);
        this.$("li").removeClass("editing");
        this.$("li[data-id=new]").remove();
        if (this.account && this.account.isNew()) {
            this.collection.remove(this.account, {silent: true});
            delete this.account;
        }
    },

    saved: function() {
        this.dataSource.fetch();
        this.$("a.save").stopLoading();
        this.render();
    },

    saveFailed: function() {
        this.$("a.save").stopLoading();
    },

    removeSharedAccountAlert: function(e) {
        e.preventDefault();
        var alert = new chorus.alerts.RemoveSharedAccount();
        alert.bind("removeSharedAccount", _.bind(this.confirmRemoveSharedAccount, this));
        this.launchSubModal(alert);
    },

    confirmRemoveSharedAccount: function() {
        var localGroup = _.extend({}, Backbone.Events);
        function displaySuccessToast() {
            this.dataSource.set({shared: false});
            chorus.toast("data_sources.shared_account_removed");
            this.render();
            localGroup.stopListening();
        }

        function displayFailureToast() {
            chorus.toast("data_sources.shared_account_remove_failed");
            localGroup.stopListening();
        }

        localGroup.listenTo(this.dataSource.sharing(), "destroy", _.bind(displaySuccessToast, this));
        localGroup.listenTo(this.dataSource.sharing(), "destroyFailed", _.bind(displayFailureToast, this));

        this.dataSource.sharing().set({id: -1}); // so that model isNew() is false, and destroy sends message to server
        this.dataSource.sharing().destroy();
    },

    addSharedAccountAlert: function(e) {
        e.preventDefault();
        var alert = new chorus.alerts.AddSharedAccount();
        alert.bind("addSharedAccount", _.bind(this.confirmAddSharedAccount, this));
        this.launchSubModal(alert);
    },

    confirmAddSharedAccount: function() {
        var localGroup = _.extend({}, Backbone.Events);
        function success() {
            this.dataSource.set({shared: true});
            chorus.toast("data_sources.shared_account_added");
            this.render();
            localGroup.stopListening();

            this.collection.fetch();
        }

        function displayFailureToast() {
            chorus.toast("data_sources.shared_account_add_failed");
            localGroup.stopListening();
        }

        localGroup.listenTo(this.dataSource.sharing(), "saved", _.bind(success, this));
        localGroup.listenTo(this.dataSource.sharing(), "saveFailed", _.bind(displayFailureToast, this));

        this.dataSource.sharing().unset("id"); // so that model isNew() is true, and server sees a create
        this.dataSource.sharing().save();
    },

    confirmRemoveCredentials: function(e) {
        e.preventDefault();
        var accountId = $(e.target).closest("li").data("id");
        var selectedUser = this.collection.get(accountId).user();

        var alert = new chorus.alerts.RemoveIndividualAccount(
            {
                dataSourceName: this.dataSource.get("name"),
                name: selectedUser.displayName()
            });

        this.launchSubModal(alert);
        alert.bindOnce("removeIndividualAccount", _.bind(this.removeIndividualAccount, this, accountId));
    },

    removeIndividualAccount: function(accountId) {
        var account = this.collection.get(accountId);
        var selectedUser = this.collection.get(accountId).user();

        this.listenTo(account, "destroyFailed", function() {
            this.showErrors(account);
        }, this);
        this.listenTo(account, "destroy", function() {
            chorus.toast("data_sources.remove_individual_account.toast", {
                dataSourceName: this.dataSource.get("name"),
                userName: selectedUser.displayName()
            });
            this.collection.fetch();
        }, this);

        account.destroy();
    }
});
