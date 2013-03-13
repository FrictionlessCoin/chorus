chorus.dialogs.InstancePermissions = chorus.dialogs.Base.extend({
    constructorName: "InstancePermissions",

    templateName: "instance_permissions",
    title: t("instances.permissions_dialog.title"),
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
        this.model = this.instance = this.options.instance;

        this.ownership = new chorus.models.DataSourceOwnership({instanceId: this.instance.id});
        this.users = new chorus.collections.UserSet();
        this.bindings.add(this.users, "reset", this.populateSelect);
        this.users.sortAsc("firstName");
        this.users.fetchAll();
        this.collection = this.instance.accounts();

        this.bindings.add(this.collection, "reset", this.render);
        this.bindings.add(this.collection, "add", this.render);
        this.bindings.add(this.collection, "saved", this.saved);
        this.bindings.add(this.collection, "saveFailed", this.saveFailed);
        this.bindings.add(this.collection, "validationFailed", this.saveFailed);

    },

    additionalContext: function(context) {
        return {
            sharedAccount: this.instance.isShared(),
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
                isOwner: this.instance.isOwner(account.user())
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
        var ownerId = this.instance.accountForOwner().get("id");
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
        var ownerId = this.instance.accountForOwner().get("id");
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
        this.bindings.add(this.ownership, "saveFailed", function() { this.showErrors(this.ownership); });
        this.bindings.add(this.ownership, "saved", function() {
            chorus.toast("instances.confirm_change_owner.toast");
            this.closeModal();
            this.collection.fetch({
                success: _.bind(function() {
                    this.instance.set({ owner: { id: newOwnerId } });
                    this.instance.trigger("invalidated");
                }, this)
            });
        });

        this.ownership.save({ id: newOwnerId });
    },

    newAccount: function(e) {
        var button = this.$("button.add_account");
        if (button.is(":disabled")) return;
        this.account = new chorus.models.InstanceAccount({instanceId: this.instance.get("id")});
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
        if (this.instance.isShared()) {
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
        select.val(this.instance.owner().get("id"));
        this.updateUserSelect();
        $('li[data-id=new] select').change(_.bind(this.updateUserSelect, this));
    },

    populateNewAccountSelect: function() {
        var collectionUserSet = new chorus.collections.UserSet(this.collection.users());
        var otherUsers = this.users.select(function(user) {
            return !collectionUserSet.get(user.get("id"));
        });

        var select = this.$("li.new select.name");
        select.attr('id', 'select_new_instance_account_owner'); // need handle for Selenium to interact with JQ Select
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
        li.find("a.save").startLoading("instances.permissions.saving");

        this.bindings.add(this.account, "validationFailed", function() {
            this.showErrors(this.account);
        });
        this.bindings.add(this.account, "saveFailed", function() {
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
        this.instance.fetch();
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
        var localGroup = new chorus.BindingGroup(this);
        function displaySuccessToast() {
            this.instance.set({shared: false});
            chorus.toast("instances.shared_account_removed");
            this.render();
            localGroup.removeAll();
        }

        function displayFailureToast() {
            chorus.toast("instances.shared_account_remove_failed");
            localGroup.removeAll();
        }

        localGroup.add(this.instance.sharing(), "destroy", displaySuccessToast);
        localGroup.add(this.instance.sharing(), "destroyFailed", displayFailureToast);

        this.instance.sharing().set({id: -1}); // so that model isNew() is false, and destroy sends message to server
        this.instance.sharing().destroy();
    },

    addSharedAccountAlert: function(e) {
        e.preventDefault();
        var alert = new chorus.alerts.AddSharedAccount();
        alert.bind("addSharedAccount", _.bind(this.confirmAddSharedAccount, this));
        this.launchSubModal(alert);
    },

    confirmAddSharedAccount: function() {
        var localGroup = new chorus.BindingGroup(this);
        function success() {
            this.instance.set({shared: true});
            chorus.toast("instances.shared_account_added");
            this.render();
            localGroup.removeAll();

            this.collection.fetch();
        }

        function displayFailureToast() {
            chorus.toast("instances.shared_account_add_failed");
            localGroup.removeAll();
        }

        localGroup.add(this.instance.sharing(), "saved", success);
        localGroup.add(this.instance.sharing(), "saveFailed", displayFailureToast);

        this.instance.sharing().unset("id"); // so that model isNew() is true, and server sees a create
        this.instance.sharing().save();
    },

    confirmRemoveCredentials: function(e) {
        e.preventDefault();
        var accountId = $(e.target).closest("li").data("id");
        var selectedUser = this.collection.get(accountId).user();

        var alert = new chorus.alerts.RemoveIndividualAccount(
            {
                dataSourceName: this.instance.get("name"),
                name: selectedUser.displayName()
            });

        this.launchSubModal(alert);
        alert.bindOnce("removeIndividualAccount", _.bind(this.removeIndividualAccount, this, accountId));
    },

    removeIndividualAccount: function(accountId) {
        var account = this.collection.get(accountId);
        var selectedUser = this.collection.get(accountId).user();

        this.bindings.add(account, "destroyFailed", function() {
            this.showErrors(account);
        }, this);
        this.bindings.add(account, "destroy", function() {
            chorus.toast("instances.remove_individual_account.toast", {
                dataSourceName: this.instance.get("name"),
                userName: selectedUser.displayName()
            });
            this.collection.fetch();
        }, this);


        account.destroy();
    }
});
