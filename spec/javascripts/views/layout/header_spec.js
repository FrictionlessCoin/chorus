describe("chorus.views.Header", function() {
    beforeEach(function() {
        chorus.session = backboneFixtures.session({user: {id: 55}});
        chorus._navigated();
        this.view = new chorus.views.Header();
        spyOn(this.view, "render").andCallThrough();
        this.view.session.loaded = true;
    });

    it("has required resources", function() {
        expect(this.view.requiredResources.length).toBe(0);
    });

    it("does not have a model", function() {
        expect(this.view.model).toBeUndefined();
    });

    it("fetches unread notifications", function() {
        expect(this.view.unreadNotifications.attributes.type).toBe("unread");
        expect(this.view.unreadNotifications).toHaveBeenFetched();
    });

    it("fetches the first page of notifications (not just unread ones)", function() {
        expect(this.view.notifications.attributes.type).toBeUndefined();
        expect(this.view.notifications).toHaveBeenFetched();
    });

    context("changing the length of search results bar", function() {
        beforeEach(function(){
            spyOn(this.view, "modifyTypeAheadSearchLength").andCallThrough();
            this.view.render();
        });

        it("modifies the length of the search results bar", function() {
            expect(this.view.modifyTypeAheadSearchLength).toHaveBeenCalled();
        });

    });

    describe("the notifications", function() {
        beforeEach(function() {
            this.view.render();
            this.view.render.reset();

            this.server.completeFetchFor(this.view.notifications, [
                backboneFixtures.notification({id: '1'}),
                backboneFixtures.notification({id: '2'}),
                backboneFixtures.notification({id: '3'}),
                backboneFixtures.notification({id: '4'}),
                backboneFixtures.notification({id: '5'}),
                backboneFixtures.notification({id: '6'}),
                backboneFixtures.notification({id: '7'})
            ]);
        });

        context("when there are at least 5 unread notifications", function() {
            beforeEach(function() {
                this.server.completeFetchAllFor(this.view.unreadNotifications, [
                    backboneFixtures.notification(),
                    backboneFixtures.notification(),
                    backboneFixtures.notification(),
                    backboneFixtures.notification(),
                    backboneFixtures.notification(),
                    backboneFixtures.notification()
                ]);
            });

            it("calls render after read and unread notifications are complete", function() {
                expect(this.view.render.calls.count()).toEqual(1);
            });

            it("shows all of the unread notifications in the notification popup", function() {
                expect(this.view.notificationList.collection.length).toBe(6);
                this.view.unreadNotifications.each(function(notification, index) {
                    expect(this.view.notificationList.collection.at(index).get("cid")).toEqual(notification.get("cid"));
                }, this);
            });
        });

        context("when there are less than 5 unread notifications", function() {
            beforeEach(function() {
                this.server.completeFetchAllFor(this.view.unreadNotifications,
                    [
                        backboneFixtures.notification({ id: '1' }),
                        backboneFixtures.notification({ id: '2' })
                    ],
                    null,
                    {
                        page: 1,
                        total: 1,
                        records: 2
                    });
            });

            it("renders exactly 5 notifications, including read ones if necessary", function() {
                var listNotifications = this.view.notificationList.collection;
                expect(listNotifications.length).toBe(5);
                expect(listNotifications.at(0).get("id")).toEqual('1');
                expect(listNotifications.at(1).get("id")).toEqual('2');
                expect(listNotifications.at(2).get("id")).toEqual('3');
                expect(listNotifications.at(3).get("id")).toEqual('4');
                expect(listNotifications.at(4).get("id")).toEqual('5');
            });
        });
    });

    describe("#render", function() {
        beforeEach(function() {
            spyOn(chorus, 'addClearButton');

            this.view.session.loaded = true;
            this.view.session.trigger("loaded");
            this.server.completeFetchAllFor(this.view.unreadNotifications,
                [
                    backboneFixtures.notification(),
                    backboneFixtures.notification()
                ],
                null,
                {
                    page: 1,
                    total: 1,
                    records: 2
                });
            this.server.completeFetchFor(this.view.notifications,
                [
                    backboneFixtures.notification(),
                    backboneFixtures.notification(),
                    backboneFixtures.notification(),
                    backboneFixtures.notification(),
                    backboneFixtures.notification()
                ]);
        });

        it("should have a search field", function() {
            expect(this.view.$(".search input[type=text]")).toExist();
        });

        it("should have a link to the dashboard", function() {
            expect(this.view.$(".logo a").attr("href")).toBe("#/");
        });

        it("clears requiredResources", function() {
            expect(this.view.requiredResources.length).toBe(0);
        });

        it("inserts the number of unread notifications into the markup", function() {
            expect(this.view.$("a.notifications").text().trim()).toBe("2");
        });

        it("should have a hidden type ahead search view", function() {
            expect(this.view.$(this.view.typeAheadView.el)).toExist();
            expect($(this.view.typeAheadView.el)).toHaveClass("hidden");
        });

        it("adds a clear button to the search field", function() {
            expect(chorus.addClearButton).toHaveBeenCalledWith(this.view.$(".search input"));
        });

        describe("typing in the search bar", function() {
            beforeEach(function() {
                spyOn(this.view.typeAheadView, "searchFor").andCallThrough();
                this.view.$(".search input:text").val("test_query/with/slashes").trigger("textchange");
                this.server.completeFetchFor(this.view.typeAheadView.model);
            });

            it("shows the typeAhead view", function() {
                expect($(this.view.typeAheadView.el)).not.toHaveClass("hidden");
            });

            it("sets the query in the typeAhead view", function() {
                expect(this.view.typeAheadView.searchFor).toHaveBeenCalledWith("test_query/with/slashes");
            });

            it("hides the search view when a link is clicked (if navigating to same route as displayed in browser url bar)", function() {
                var $a = $("<a/>");
                $(this.view.typeAheadView.el).append($a);

                $a.click();

                expect($(this.view.typeAheadView.el)).toHaveClass("hidden");
                expect(this.view.$(".search input:text").val()).toBe("");
            });

            it("does not hide the typeahead view if you type again", function() {
                this.useFakeTimers();
                this.view.$(".search input:text").val("other_query").trigger("textchange");
                expect($(this.view.typeAheadView.el)).not.toHaveClass("hidden");
            });

            describe("clicking outside of the typeahead area", function() {
                beforeEach(function() {
                    $(document).trigger("click");
                });

                it("hides the search view", function() {
                    expect($(this.view.typeAheadView.el)).toHaveClass("hidden");
                });

                it("doesn't clear the search text", function() {
                    expect(this.view.$(".search input:text").val()).toBe("test_query/with/slashes");
                });
            });

            it("calls #handleKeyEvent on the type-ahead view", function() {
                spyOn(this.view.typeAheadView, 'handleKeyEvent');
                var event = jQuery.Event("keydown", { keyCode: 38 });
                this.view.$(".search input").trigger(event);
                expect(this.view.typeAheadView.handleKeyEvent).toHaveBeenCalledWith(event);
            });

            describe("submitting the search", function() {

                context("with full search enabled", function() {
                    beforeEach(function() {
                        spyOn(chorus.router, 'navigate');
                        spyOn(this.view.typeAheadView, "fullSearchEnabled").andReturn(true);
                    });

                    it("includes the query", function() {
                        this.view.$(".search form").trigger("submit");
                        expect(chorus.router.navigate).toHaveBeenCalled();
                        var url = chorus.router.navigate.lastCall().args[0];
                        expect(url).toMatch(/test_query%2Fwith%2Fslashes/);
                    });

                    context("when the header has a workspace id", function() {
                        beforeEach(function() {
                            this.view.workspaceId = '11';
                            this.view.$(".search form").trigger("submit");
                        });

                        it("navigates to the workspace search page", function() {
                            expect(chorus.router.navigate).toHaveBeenCalled();
                            var url = chorus.router.navigate.lastCall().args[0];
                            expect(url).toMatchUrl("#/workspaces/11/search/test_query%252Fwith%252Fslashes");
                        });
                    });

                    context("when the header doesn't have a workspace id", function() {
                        beforeEach(function() {
                            delete this.view.workspaceId;
                            this.view.$(".search form").trigger("submit");
                        });

                        it("navigates to the global search page", function() {
                            expect(chorus.router.navigate).toHaveBeenCalled();
                            var url = chorus.router.navigate.lastCall().args[0];
                            expect(url).toMatchUrl("#/search/test_query%252Fwith%252Fslashes");
                        });
                    });

                    context("when the search input is empty", function() {
                        beforeEach(function() {
                            this.view.$(".search input:text").val("").trigger("textchange");
                            this.view.$(".search form").trigger("submit");
                        });

                        it("should not search", function() {
                            expect(chorus.router.navigate).not.toHaveBeenCalled();
                        });
                    });
                });

                context("when full search is disabled", function() {
                    beforeEach(function() {
                        spyOn(chorus.router, 'navigate');
                        spyOn(this.view.typeAheadView, "fullSearchEnabled").andReturn(false);
                    });

                    it("does not navigate", function() {
                        this.view.$(".search form").trigger("submit");
                        expect(chorus.router.navigate).not.toHaveBeenCalled();
                    });
                });
            });
        });

        describe("advisorNow", function() {
            context("when advisorNow is not enabled", function() {
                beforeEach(function () {
                    chorus.models.Config.instance().license().set('advisorNowEnabled', false);
                    this.view.render();
                });

                it("does not display the advisorNow link", function () {
                    expect(this.view.$(".advisor_now")).not.toExist();
                });
            });

            context("when advisorNow is enabled", function() {
                beforeEach(function () {
                    chorus.models.Config.instance().license().set('advisorNowEnabled', true);
                    chorus.models.Config.instance().license().set('organizationUuid', 'my_org');
                    this.view.render();
                });

                it("displays the advisorNow link", function () {
                    var user = chorus.session.user();
                    var url = "http://advisor.alpinenow.com/start?" + $.param({
                        first_name: user.get("firstName"),
                        last_name: user.get("lastName"),
                        email: user.get("email"),
                        org_id: 'my_org'
                    });
                    expect(this.view.$(".advisor_now a")).toExist();
                    expect(this.view.$(".advisor_now a")).toHaveAttr("target", "_blank");
                    expect(this.view.$(".advisor_now a")).toHaveAttr("href", url);
                });
            });
        });

        describe("username", function() {
            beforeEach(function() {
                spyOn(chorus.session.user(), "displayName").andReturn("Armadillo");
                spyOn(chorus.session.user(), "displayShortName").andReturn("Sam");
                this.view.render();
            });

            it("has the short display name in the username link", function() {
                expect(this.view.$(".username a")).toContainText("Sam");
            });

            it("has the full name in the title of the username link", function() {
                expect(this.view.$(".username a").attr("title")).toBe("Armadillo");
            });

            it("has a hidden popup menu", function() {
                expect(this.view.$(".menu.popup_username")).toHaveClass("hidden");
            });

            describe("when clicked", function() {
                beforeEach(function() {
                    spyOn(chorus.PopupMenu, "toggle").andCallThrough();
                    this.view.$(".username a").click();
                });

                it("shows a popup menu", function() {
                    expect(this.view.$(".menu.popup_username")).not.toHaveClass("hidden");
                });

                it("opens a popup menu with the correct element", function() {
                    expect(chorus.PopupMenu.toggle).toHaveBeenCalledWith(this.view, ".menu.popup_username", jasmine.any(jQuery.Event));
                });

                describe("and when clicked again", function() {
                    beforeEach(function() {
                        this.view.$(".username a").click();
                    });
                    it("becomes hidden again", function() {
                        expect(this.view.$(".menu.popup_username")).toHaveClass("hidden");
                    });
                });
            });

            describe("the popup menu", function() {
                itBehavesLike.PopupMenu(".username a", ".menu.popup_username");

                it("has a link to 'your profile'", function() {
                    expect(this.view.$(".menu.popup_username a[href='#/users/55']").text()).toBe(t("header.your_profile"));
                });

                it("has a link to 'sign out'", function() {
                    expect(this.view.$(".menu.popup_username a[href='#/logout']").text()).toBe(t("header.sign_out"));
                });
            });
        });

        describe("the gear menu", function() {
            it("is rendered", function() {
                expect(this.view.$(".gear a img")).toHaveAttr("src", "/images/gear_menu.png");
            });

            it("has a hidden popup menu", function() {
                expect(this.view.$(".menu.popup_gear")).toHaveClass("hidden");
            });

            describe("when clicked", function() {
                beforeEach(function() {
                    spyOn(chorus.PopupMenu, "toggle").andCallThrough();
                    this.view.$(".gear a").click();
                });

                it("shows a popup menu", function() {
                    expect(this.view.$(".menu.popup_gear")).not.toHaveClass("hidden");
                });

                it("opens a popup menu with the correct element", function() {
                    expect(chorus.PopupMenu.toggle).toHaveBeenCalledWith(this.view, ".menu.popup_gear", jasmine.any(jQuery.Event));
                });

                describe("and when clicked again", function() {
                    beforeEach(function() {
                        this.view.$(".gear a").click();
                    });
                    it("becomes hidden again", function() {
                        expect(this.view.$(".menu.popup_gear")).toHaveClass("hidden");
                    });
                });
            });

            describe("the popup menu", function() {
                itBehavesLike.PopupMenu(".gear a", ".menu.popup_gear");

                it("has a link to 'Users'", function() {
                    expect(this.view.$(".menu.popup_gear a[href='#/users']").text()).toMatchTranslation("header.users_list");
                });

                it('has a link to data sources', function() {
                    expect(this.view.$(".menu.popup_gear a[href='#/data_sources']").text()).toMatchTranslation("header.data_sources");
                });

                it("has a link to the workspaces list", function() {
                    expect(this.view.$(".menu.popup_gear a[href='#/workspaces']").text()).toMatchTranslation("header.workspaces");
                });

                it("has a link to the notifications", function() {
                    expect(this.view.$(".menu.popup_gear a[href='#/notifications']").text()).toMatchTranslation("header.notifications");
                });

                it("has a link to the tags", function() {
                    expect(this.view.$(".menu.popup_gear a[href='#/tags']").text()).toMatchTranslation("header.tags");
                });
            });

        });

        describe("notifications", function() {
            it("displays the notification link", function() {
                expect(this.view.$("a.notifications")).toExist();
            });

            describe("when the notification count is clicked", function() {
                beforeEach(function() {
                    spyOn(chorus.PopupMenu, "toggle").andCallThrough();
                    spyOn(this.view.unreadNotifications, "markAllRead").andCallFake(_.bind(function(options) {
                        this.successFunction = options.success;
                    }, this));
                    spyOn(this.view.notificationList, "show");
                    this.view.$("a.notifications").click();
                });

                it("shows a popup menu", function() {
                    expect(this.view.$(".menu.popup_notifications")).not.toHaveClass("hidden");
                });

                it("opens a popup menu with the correct element", function() {
                    expect(chorus.PopupMenu.toggle).toHaveBeenCalledWith(this.view, ".menu.popup_notifications", jasmine.any(jQuery.Event));
                });

                it("marks the notifications as read", function() {
                    expect(this.view.unreadNotifications.markAllRead).toHaveBeenCalled();
                    expect(this.successFunction).toBeDefined();
                });

                it("calls show on the notification list", function() {
                    expect(this.view.notificationList.show).toHaveBeenCalled();
                });

                describe("when the mark-all-read call succeeds", function() {
                    beforeEach(function() {
                        this.successFunction();
                    });

                    it("updates the unread notification count", function() {
                        expect(this.view.$("a.notifications")).toHaveText("0");
                    });

                    it("makes the notifications look empty", function() {
                        expect(this.view.$("a.notifications")).toHaveClass("empty");
                    });
                });

                describe("and then clicked again", function() {
                    beforeEach(function() {
                        this.view.unreadNotifications.markAllRead.reset();
                        spyOn(this.view.notificationList, "postRender");
                        this.view.$("a.notifications").click();
                    });

                    it("becomes hidden again", function() {
                        expect(this.view.$(".menu.popup_notifications")).toHaveClass("hidden");
                    });

                    it("internally marks the unread notifications as read", function() {
                        expect(this.view.unreadNotifications.find(function(model) { return model.get("unread"); })).toBeUndefined();
                    });

                    it("re-renders the notification list subview", function() {
                        expect(this.view.notificationList.postRender).toHaveBeenCalled();
                    });

                    it("does not re-mark the notifications as read", function() {
                        expect(this.view.unreadNotifications.markAllRead).not.toHaveBeenCalled();
                    });
                });

                it("has a notification list", function() {
                    expect(this.view.notificationList).toBeA(chorus.views.NotificationList);
                    expect(this.view.$(".popup_notifications")).toContain(this.view.notificationList.el);
                });

                describe("when a notification:deleted event occurs", function() {
                    beforeEach(function() {
                        this.server.reset();
                        this.view.unreadNotifications.loaded = true;
                        this.view.notifications.loaded = true;
                        chorus.PageEvents.trigger("notification:deleted");
                    });

                    it("should re-fetch the notifications", function() {
                        expect(this.server.lastFetchAllFor(this.view.unreadNotifications)).toBeDefined();
                        expect(this.view.notifications).toHaveBeenFetched();
                    });

                    context("when the fetch completes", function() {
                        beforeEach(function() {
                            this.server.completeFetchAllFor(this.view.unreadNotifications, [], null, { total: 0, page: 1, records: 0 });
                            this.server.completeFetchAllFor(this.view.notifications, [
                                backboneFixtures.notification(),
                                backboneFixtures.notification(),
                                backboneFixtures.notification(),
                                backboneFixtures.notification()
                            ]);
                        });

                        it("should display the new unread notification count", function() {
                            expect(this.view.$("a.notifications").text()).toBe("0");
                        });

                        it("should render the new notification list", function() {
                            expect(this.view.$(".popup_notifications li").length).toBe(4);
                        });
                    });
                });

                it("has a show-all link", function() {
                    expect(this.view.$(".popup_notifications a.notifications_all")).toContainTranslation("notification.see_all");
                    expect(this.view.$(".popup_notifications a.notifications_all").attr("href")).toBe("#/notifications");
                });
            });
        });
    });

    context("when in dev mode", function() {
        beforeEach(function() {
            this.users = new chorus.collections.UserSet([
                backboneFixtures.user({firstName: "user", lastName: "one", id: "1", admin: false}),
                backboneFixtures.user({firstName: "user", lastName: "two", id: "2", admin: false})
            ]);
            chorus.isDevMode.andReturn(true);

            this.view = new chorus.views.Header();
            this.view.session.loaded = true;
            this.server.completeFetchAllFor(this.view.unreadNotifications);
            this.server.completeFetchFor(this.view.notifications);

            this.view.render();
        });

        it("should fetch the users", function() {
            expect(this.server.lastFetch().url).toBe(this.view.users.url({ page: 1, per_page: 1000}));
        });

        context("after fetches completes", function() {
            beforeEach(function() {
                this.server.completeFetchAllFor(this.view.users, this.users.models);
            });

            afterEach(function() {
                $("select.switch_user").remove();
            });

            it("should have a single switch user to x select box", function() {
                expect($("select.switch_user")).toExist();
            });

            it("should have an option to switch to each user", function() {
                this.users.each(function(user, i) {
                    var option = $(".switch_user option").eq(i + 1);
                    expect(option).toContainText(user.displayName());
                    expect(option.val()).toBe(user.get("username"));
                }, this);
            });

            context("selecting a user", function() {
                beforeEach(function() {
                    var select = $('.switch_user');
                    this.selectedUserName = $('.switch_user option:eq(1)').val();
                    select.val(this.selectedUserName);
                    select.change();
                });

                it("should log the current user out", function() {
                    expect(this.server.lastDestroyFor(chorus.session)).toBeDefined();
                });

                context("when the logout and login finish", function() {
                    beforeEach(function() {
                        spyOn(chorus.router, "reload");
                        this.server.lastRequest().succeed(); // completes logout
                    });

                    context("when the login finish successfully", function() {
                        beforeEach(function() {
                            this.server.completeCreateFor(chorus.session, backboneFixtures.session({user: this.users.at(0).attributes}));
                        });

                        it("updates the chorus.session.user model", function() {
                            expect(chorus.session.user().get("username")).toBe(this.selectedUserName);
                        });

                        it("reloads the current page", function() {
                            expect(chorus.router.reload).toHaveBeenCalled();
                        });
                    });

                    context("when the login failed", function() {
                        beforeEach(function() {
                            spyOnEvent(chorus.session, "needsLogin");
                            chorus.session.trigger("saveFailed");
                        });

                        it("triggers needs Login", function() {
                            expect("needsLogin").toHaveBeenTriggeredOn(chorus.session);
                        });
                    });
                });
            });
        });
    });

    describe('#disableSearch', function() {
        beforeEach(function() {
            spyOn(this.view.typeAheadView, "disableSearch");
            this.view.disableSearch();
        });

        it("delegates to the type ahead search", function() {
            expect(this.view.typeAheadView.disableSearch).toHaveBeenCalled();
        });
    });
});
