chorus.views.Header = chorus.views.Base.extend({
    constructorName: "HeaderView",
    templateName: "header",
    events: {
        "click .username a": "togglePopupUsername",
        "click .account a": "togglePopupAccount",
        "click a.notifications": "togglePopupNotifications",
        "click .gear a": "togglePopupGear",
        "submit .search form": "startSearch",
        "click .type_ahead_result a": "clearSearch",
        "keydown .search input": "searchKeyPressed"
    },

    subviews: {
        ".popup_notifications ul": "notificationList",
        ".type_ahead_result": "typeAheadView"
    },

    setup: function() {
        this.popupEventName = "chorus:menu:popup." + this.cid;
        $(document).bind(this.popupEventName, _.bind(this.popupEventHandler, this));
        this.session = chorus.session;
        this.unreadNotifications = new chorus.collections.NotificationSet([], { type: 'unread' });
        this.notifications = new chorus.collections.NotificationSet();
        this.notifications.per_page = 5;

        this.typeAheadView = new chorus.views.TypeAheadSearch();

        this.notificationList = new chorus.views.NotificationList({
            collection: new chorus.collections.NotificationSet()
        });

        this.listenTo(this.unreadNotifications, "loaded", this.updateNotifications);
        this.listenTo(this.notifications, "loaded", this.updateNotifications);

        this.unreadNotifications.fetchAll();
        this.notifications.fetch();

        if (chorus.isDevMode()) {
            this.users = new chorus.collections.UserSet();
            this.users.fetchAll();
        }

        this.subscribePageEvent("notification:deleted", this.refreshNotifications);
    },

    updateNotifications: function() {
        if (this.notifications.loaded && this.unreadNotifications.loaded) {
            this.notificationList.collection.reset(this.unreadNotifications.models, { silent: true });
            var numberToAdd = (5 - this.unreadNotifications.length);
            if (numberToAdd > 0) {
                this.notificationList.collection.add(this.notifications.chain().reject(
                    function(model) {
                        return !!this.unreadNotifications.get(model.get("id"));
                    }, this).first(numberToAdd).value());
            }

            this.notificationList.collection.loaded = true;
            this.render();
        }
    },

    postRender: function() {
        this.$(".search input").unbind("textchange").bind("textchange", _.bind(this.displayResult, this));
        chorus.addClearButton(this.$(".search input"));

        if (chorus.isDevMode()) {
            this.addFastUserToggle();
        }
    },

    addFastUserToggle: function() {
        var self = this;
        var session = chorus.session;

        function switchUser(username) {
            session.requestLogout(function() {
                // log back in as new user
                self.bindings.add(session, "saved", _.bind(chorus.router.reload, chorus.router));
                self.bindings.add(session, "saveFailed", function() { session.trigger("needsLogin"); });
                session.save({username: username, password: "secret"});
            });
        }

        function addDropdown() {
            $('select.switch_user').remove();
            var $select = $("<select class='switch_user'></select>");

            $select.append("<option>Switch to user..</option>");
            self.users.each(function(user) {
                $select.append("<option value=" + Handlebars.Utils.escapeExpression(user.get("username")) + ">" + Handlebars.Utils.escapeExpression(user.displayName()) + "</option>");
            });

            $("body").append($select);
            $select.unbind("change").bind("change", function() {
                switchUser($(this).val());
            });
        }

        this.bindings.add(this.users, "loaded", addDropdown);
    },

    searchKeyPressed: function(event) {
        this.typeAheadView.handleKeyEvent(event);
    },

    displayResult: function() {
        var query = this.$(".search input").val();
        if (this.typeAheadView.searchFor(query)) {
            this.captureClicks();
        } else {
            this.releaseClicks();
        }
    },

    clearSearch: function() {
        this.$(".search input").val('');
        this.dismissSearch();
    },

    dismissSearch: function() {
        this.$(".type_ahead_result").addClass("hidden");
    },

    teardown: function() {
        $(document).unbind(this.popupEventName);
        this._super("teardown");
    },

    additionalContext: function(ctx) {
        this.requiredResources.reset();
        var user = this.session.user();

        return _.extend(ctx, this.session.attributes, {
            notifications: this.unreadNotifications,
            fullName: user && user.displayName(),
            displayName: user && user.displayShortName(),
            userUrl: user && user.showUrl()
        });
    },

    refreshNotifications: function() {
        this.notifications.loaded = false;
        this.unreadNotifications.loaded = false;
        this.requiredResources.add([this.unreadNotifications, this.notifications]);
        this.notifications.fetch();
        this.unreadNotifications.fetchAll();
    },

    togglePopupNotifications: function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        var beingShown = this.$(".menu.popup_notifications").hasClass("hidden");
        this.dismissPopups();
        this.triggerPopupEvent(e.target);

        if (beingShown) {
            this.captureClicks();
            this.unreadNotifications.markAllRead({ success: _.bind(this.clearNotificationCount, this) });
            this.notificationList.show();
        } else {
            this.unreadNotifications.each(function(model) {
                model.set({ unread: false }, { silent: true });
            });
            this.notificationList.collection.trigger("reset");
        }

        this.$(".menu.popup_notifications").toggleClass("hidden", !beingShown);
    },

    clearNotificationCount: function() {
        this.$("a.notifications").text("0").addClass("empty");
    },

    togglePopupUsername: function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        var userNameWasPoppedUp = !this.$(".menu.popup_username").hasClass("hidden");
        this.dismissPopups();
        this.triggerPopupEvent(e.target);

        if (!userNameWasPoppedUp) {
            this.captureClicks();
        }

        this.$(".menu.popup_username").toggleClass("hidden", userNameWasPoppedUp);
    },

    togglePopupGear: function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        var gearNameWasPoppedUp = !this.$(".menu.popup_gear").hasClass("hidden");
        this.dismissPopups();
        this.triggerPopupEvent(e.target);

        if (!gearNameWasPoppedUp) {
            this.captureClicks();
        }

        this.$(".menu.popup_gear").toggleClass("hidden", gearNameWasPoppedUp);
    },

    togglePopupAccount: function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        var accountNameWasPoppedUp = !this.$(".menu.popup_account").hasClass("hidden");
        this.dismissPopups();
        this.triggerPopupEvent(e.target);

        if (!accountNameWasPoppedUp) {
            this.captureClicks();
        }

        this.$(".menu.popup_account").toggleClass("hidden", accountNameWasPoppedUp);
    },

    triggerPopupEvent: function(el) {
        $(document).trigger("chorus:menu:popup", el);
    },

    captureClicks: function() {
        $(document).bind("click.popup_menu", _.bind(this.dismissPopups, this));
    },

    releaseClicks: function() {
        $(document).unbind("click.popup_menu");
    },

    popupEventHandler: function(ev, el) {
        if ($(el).closest(".header").length === 0) {
            this.dismissPopups();
            this.releaseClicks();
        }
    },

    dismissPopups: function() {
        this.dismissSearch();
        this.releaseClicks();
        this.$(".menu").addClass("hidden");
    },

    startSearch: function(e) {
        e.preventDefault();
        var search = new chorus.models.SearchResult({
            workspaceId: this.workspaceId,
            query: this.$(".search input:text").val()
        });
        chorus.router.navigate(search.showUrl());
    }
});
