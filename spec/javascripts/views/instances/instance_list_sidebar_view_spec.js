describe("chorus.views.InstanceListSidebar", function() {
    context("when no instance is selected", function() {
        beforeEach(function() {
            this.view = new chorus.views.InstanceListSidebar();
            this.view.render();
        });

        describe("render", function() {
            it("should not display instance information", function() {
                expect(this.view.$(".info")).not.toExist();
            });
        });
    });

    context("when a gpdb instance is selected", function() {
        beforeEach(function() {
            this.instance = rspecFixtures.gpdbDataSource({name: "Harry's House of Glamour", version: "99.999" });
            this.activityViewStub = stubView("", { className: "activity_list" });
            spyOn(chorus.views, 'ActivityList').andReturn(this.activityViewStub);

            spyOn(chorus.views.Base.prototype, "render").andCallThrough();
            this.view = new chorus.views.InstanceListSidebar();
            chorus.PageEvents.broadcast("instance:selected", this.instance);
            $('#jasmine_content').append(this.view.el);
        });

        it("fetches the activities, instance usage and accounts", function() {
            expect(this.instance.activities()).toHaveBeenFetched();
            expect(this.instance.usage()).toHaveBeenFetched();
            expect(this.instance.accounts()).toHaveAllBeenFetched();
        });

        context("when the data has been loaded", function() {
            beforeEach(function() {
                spyOn(chorus.views.Sidebar.prototype, 'postRender');
                this.server.completeFetchFor(this.instance.activities());
                var instanceAccountSet = rspecFixtures.instanceAccountSet();
                instanceAccountSet.models[0].set({owner: {id: this.instance.owner().id}});
                this.server.completeFetchAllFor(this.instance.accounts(), instanceAccountSet.models);
                this.server.completeFetchFor(this.instance.accountForCurrentUser());
            });

            it("displays instance name", function() {
                expect(this.view.$(".instance_name").text()).toBe("Harry's House of Glamour");
            });

            it("displays instance type", function() {
                expect(this.view.$(".instance_type")).toContainText("Greenplum Database");
            });

            it("calls super in postRender (so that scrolling works)", function() {
                expect(chorus.views.Sidebar.prototype.postRender).toHaveBeenCalled();
            });

            it("renders ActivityList subview", function() {
                expect(this.view.$(".activity_list")).toBeVisible();
            });

            it("populates the ActivityList with the activities", function() {
                expect(chorus.views.ActivityList.mostRecentCall.args[0].collection).toBe(this.instance.activities());
            });

            it("sets the ActivityList displayStyle to without_object", function() {
                expect(chorus.views.ActivityList.mostRecentCall.args[0].displayStyle).toBe('without_object');
            });

            it("has a 'add a note' link", function() {
                expect(this.view.$("a[data-dialog=NotesNew]")).toExist();
                expect(this.view.$("a[data-dialog=NotesNew]").text()).toMatchTranslation("actions.add_note");
                expect(this.view.$("a[data-dialog=NotesNew]").data("workfileAttachments")).toBeFalsy();
                expect(this.view.$("a[data-dialog=NotesNew]").data("entityType")).toBe('gpdb_data_source');
            });

            context("when user is an admin or owner of the instance", function() {
                it("displays edit instance link when user is admin", function() {
                    setLoggedInUser({ username: "benjamin", admin: true});
                    this.view.render();
                    expect(this.view.$(".actions .edit_instance")).toExist();
                });

                it("displays edit instance link when user is owner", function() {
                    setLoggedInUser({ username: "benjamin", admin: false});
                    this.instance.set({owner: {id: chorus.session.user().get('id')} });
                    this.view.render();
                    expect(this.view.$(".actions .edit_instance")).toExist();
                });

                it("does not display the delete instance link", function() {
                    expect(this.view.$(".actions .delete_instance")).not.toExist();
                });

                context("when the instance is offline", function() {
                    beforeEach(function() {
                        setLoggedInUser({ username: "benjamin", admin: true});
                        this.instance.set({
                            online: false
                        });
                        this.view.render();
                    });

                    it("does display the edit instance link", function() {
                        expect(this.view.$(".actions .edit_instance")).toExist();
                    });

                    it("does display the edit accounts link", function() {
                        expect(this.view.$("a[data-dialog=InstancePermissions]")).toExist();
                    });
                });
            });

            context("when user is not an admin or owner of the instance", function() {
                beforeEach(function() {
                    setLoggedInUser({ username: "benjamin", admin: false});
                    this.instance.set({owner: {id: "harry"}});
                    this.view.render();
                });

                it("does not display edit instance link when user is neither admin nor owner", function() {
                    expect(this.view.$(".actions .edit_instance")).not.toExist();
                });

                it("does not display the delete instance link", function() {
                    expect(this.view.$(".actions .delete_instance")).not.toExist();
                });
            });

            context("when configuration is clicked", function() {
                beforeEach(function() {
                    expect(this.view.$(".instance_configuration_details")).not.toBeVisible();
                    this.view.$(".tab_control .tabs li[data-name=configuration]").click();
                });

                it("shows configuration", function() {
                    expect(this.view.$(".instance_configuration_details")).not.toHaveClass("hidden");
                    expect(this.view.$(".activity_list")).toHaveClass("hidden");
                });

                it("shows the database version", function() {
                    expect(this.view.$(".instance_configuration_details")).toContainTranslation("instances.version");
                    expect(this.view.$(".instance_configuration_details")).toContainText("99.999");
                });

                describe("for existing gpdb instance", function() {
                    context("and the instance has a shared account", function() {
                        beforeEach(function() {
                            var instance = rspecFixtures.gpdbDataSource({"shared":true});
                            instance.loaded = true;
                            this.view.setInstance(instance);
                            this.server.completeFetchFor(instance.usage(), { workspaces: [] });
                            var instanceAccountSet = rspecFixtures.instanceAccountSet();
                            instanceAccountSet.models[0].set({owner: {id: this.instance.owner().id}});
                            this.server.completeFetchFor(instance.accounts(), instanceAccountSet.models);
                            this.server.completeFetchFor(instance.accountForCurrentUser());
                        });

                        it("includes the shared account information", function() {
                            expect(this.view.$(".instance_configuration_details").text().indexOf(t("instances.shared_account"))).not.toBe(-1);
                        });
                    });

                    context("and the instance does not have a shared account", function() {
                        it("does not include the shared account information", function() {
                            this.view.render();
                            expect(this.view.$(".instance_configuration_details").text().indexOf(t("instances.shared_account"))).toBe(-1);
                        });
                    });
                });

                describe("for a new gpdb instance", function() {
                    beforeEach(function() {
                        this.view.model = this.view.model.set({ size: "1", port: null, host: null });
                        this.view.render();
                    });

                    it("includes gpdb size information", function() {
                        expect(this.view.$(".instance_configuration_details").text().indexOf(t("instances.sidebar.size"))).not.toBe(-1);
                    });

                    it("does not include the port, host, or shared account information", function() {
                        expect(this.view.$(".instance_configuration_details").text().indexOf(t("instances.sidebar.host"))).toBe(-1);
                        expect(this.view.$(".instance_configuration_details").text().indexOf(t("instances.sidebar.port"))).toBe(-1);
                        expect(this.view.$(".instance_configuration_details").text().indexOf(t("instances.shared_account"))).toBe(-1);
                    });
                });
            });

            context("when the instance has a shared account", function() {
                beforeEach(function() {
                    this.instance.set({
                        shared: true
                    });
                    this.instance._accountForCurrentUser = rspecFixtures.instanceAccount();
                    this.view.render();
                });

                it("does not show the 'edit credentials' link", function() {
                    expect(this.view.$(".actions .edit_credentials")).not.toExist();
                });

                it("does not show the 'add credentials' link", function() {
                    expect(this.view.$(".actions .add_credentials")).not.toExist();
                });

                it("displays the instance shared account info", function () {
                    expect(this.view.$(".instance_configuration_details .shared_account_info")).toContainText(this.instance.accountForOwner().get("dbUsername"));
                });

                it("displays edit instance link when user is admin", function() {
                    setLoggedInUser({ username: "benjamin", admin: true});
                    this.view.render();
                    expect(this.view.$(".actions .edit_instance")).toExist();
                });

                it("displays edit instance link when user is owner", function() {
                    setLoggedInUser({ username: "benjamin", admin: false});
                    this.instance.accounts().reset([rspecFixtures.instanceAccount({owner: {id: chorus.session.user().get('id')}})]);
                    this.instance.set({owner: {id: chorus.session.user().get('id')}});
                    this.view.render();
                    expect(this.view.$(".actions .edit_instance")).toExist();
                });

                it("does NOT display the edit instance link when user is not an admin or owner", function() {
                    setLoggedInUser({ username: "benjamin", admin: false});
                    this.view.render();
                    expect(this.view.$(".actions .edit_instance")).not.toExist();
                });

                it("shows shared account information", function() {
                    expect(this.view.$(".account_info")).toContainTranslation("instances.sidebar.is_shared_account");
                });
            });

            context("when the instance does not have a shared account", function() {
                context("when the current user is NOT an admin or owner of the instance", function() {
                    context("when the user does not have an account for the instance", function() {
                        it("shows the 'no access' text and image", function() {
                            expect(this.view.$(".account_info img").attr("src")).toBe("/images/data_sources/no_access.png");
                            expect(this.view.$(".account_info").text().trim()).toMatchTranslation("instances.sidebar.no_access");
                        });

                        it("shows the add credentials link", function() {
                            var addCredentialsLink = this.view.$(".actions a.add_credentials");
                            expect(addCredentialsLink).toExist();
                            expect(addCredentialsLink.data("dialog")).toBe("InstanceAccount");
                            expect(addCredentialsLink.data("title")).toMatchTranslation("instances.account.add.title");
                            expect(addCredentialsLink.text()).toMatchTranslation("instances.sidebar.add_credentials");
                            expect(addCredentialsLink.data("instance")).toBe(this.instance);
                        });

                        it("does not show the 'edit credentials' link", function() {
                            expect(this.view.$(".actions .edit_credentials")).not.toExist();
                        });

                        it("does not show the 'remove credentials' link", function() {
                            expect(this.view.$(".actions .remove_credentials")).not.toExist();
                        });
                    });

                    context("when the user has set up an account for the instance", function() {
                        beforeEach(function() {
                            var account = rspecFixtures.instanceAccount();
                            spyOn(this.instance, 'accountForCurrentUser').andReturn(account);
                            this.view.render();
                        });

                        it("shows the 'access' text and image", function() {
                            expect(this.view.$(".account_info img").attr("src")).toBe("/images/data_sources/access.png");
                            expect(this.view.$(".account_info").text().trim()).toMatchTranslation("instances.sidebar.access");
                        });

                        it("shows the 'remove credentials' link", function() {
                            expect(this.view.$(".actions .remove_credentials").text()).toMatchTranslation("instances.sidebar.remove_credentials");
                            expect(this.view.$(".actions .remove_credentials").data("alert")).toBe("InstanceAccountDelete");
                        });

                        it("shows the 'edit credentials' link", function() {
                            var editCredentialsLink = this.view.$(".actions .edit_credentials");
                            expect(editCredentialsLink).toExist();
                            expect(editCredentialsLink.data("dialog")).toBe("InstanceAccount");
                            expect(editCredentialsLink.data("title")).toMatchTranslation("instances.account.edit.title");
                            expect(editCredentialsLink.text()).toMatchTranslation("instances.sidebar.edit_credentials");
                            expect(editCredentialsLink.data("instance")).toBe(this.instance);
                        });

                        it("does not show the 'add credentials' link", function() {
                            expect(this.view.$(".actions .add_credentials")).not.toExist();
                        });

                        describe("when the user removes their credentials", function() {
                            beforeEach(function() {
                                this.instance.accountForCurrentUser = this.instance.accountForCurrentUser.originalValue;
                                this.instance.accountForCurrentUser().trigger("destroy");
                                this.view.render();
                            });

                            it("shows the add credentials link", function() {
                                expect(this.view.$(".actions .add_credentials")).toExist();
                                expect(this.view.$(".actions .add_credentials").data("dialog")).toBe("InstanceAccount");
                                expect(this.view.$(".actions .add_credentials").data("title")).toMatchTranslation("instances.account.add.title");
                                expect(this.view.$(".actions .add_credentials").text()).toMatchTranslation("instances.sidebar.add_credentials");
                            });
                        });
                    });
                });

                context("when the current user is an admin", function() {
                    beforeEach(function() {
                        var account = rspecFixtures.instanceAccount();
                        spyOn(this.instance, 'accountForCurrentUser').andReturn(account);
                        this.instance.accounts().add([rspecFixtures.instanceAccount(), rspecFixtures.instanceAccount(), rspecFixtures.instanceAccount({id: null})]);
                        setLoggedInUser({ username: "benjamin", admin: true});
                        this.view.render();
                    });

                    it("does not show the individual_account area", function() {
                        expect(this.view.$('.individual_account')).not.toBeVisible();
                    });

                    it("does not show the add/edit/remove credentials links", function() {
                        expect(this.view.$(".actions .remove_credentials")).not.toBeVisible();
                        expect(this.view.$(".actions .edit_credentials")).not.toBeVisible();
                        expect(this.view.$(".actions .add_credentials")).not.toBeVisible();
                    });

                    it("shows the edit_individual_accounts area", function() {
                        var editAccountsSection = this.view.$(".edit_individual_accounts"),
                            editAccountsLink = editAccountsSection.find("a");

                        expect(editAccountsSection).toBeVisible();
                        expect(editAccountsLink).toBeVisible();
                        expect(this.view.$(".individual_accounts_count").text()).toMatchTranslation('instances.sidebar.there_are_x_individual_accounts', {count: 4});
                        expect(editAccountsLink.data("instance")).toBe(this.instance);
                        expect(editAccountsLink.data("dialog")).toBe("InstancePermissions");
                    });
                });
            });

            it("has the default loading text on the workspace usage link", function() {
                expect(this.view.$(".actions .workspace_usage")).toContainTranslation("instances.sidebar.usage_loading");
            });

            context("when the workspace usage fetch completes", function() {
                beforeEach(function() {
                    this.server.completeFetchFor(this.instance.usage(), rspecFixtures.instanceDetails());
                });

                context("when there are no workspaces", function() {
                    beforeEach(function() {
                        this.instance.usage().set({workspaces: []});
                        this.instance.usage().trigger("loaded");
                    });

                    it("should disable the link", function() {
                        expect(this.view.$('.actions .workspace_usage')).toHaveClass('disabled');
                        expect(this.view.$('.actions .workspace_usage').data('dialog')).toBeUndefined();
                    });

                    it("should show a count of zero", function() {
                        expect(this.view.$('.actions .workspace_usage')).toContainTranslation('instances.sidebar.usage', {count: 0});
                    });
                });

                context("when there are workspaces", function() {
                    beforeEach(function() {
                        expect(this.instance.usage().get("workspaces").length).toBeGreaterThan(0);
                    });

                    it("should be a dialog link", function() {
                        expect(this.view.$('.actions .workspace_usage')).not.toHaveClass("disabled");
                        expect(this.view.$('.actions .workspace_usage')).toHaveClass("dialog");
                        expect(this.view.$(".actions .workspace_usage")).toHaveData("instance", this.instance);
                    });

                    it("should show the appropriate number of workspaces", function() {
                        expect(this.view.$('.actions .workspace_usage')).toContainTranslation('instances.sidebar.usage', {count: this.instance.usage().get("workspaces").length});
                    });
                });
            });
        });

        context("when the user doesn't have permission to fetch the instances workspace usage", function() {
            beforeEach(function() {
                this.server.completeFetchFor(this.instance.activities());
                this.server.completeFetchAllFor(this.instance.accounts());
                this.server.completeFetchFor(this.instance.accountForCurrentUser());
                this.server.completeFetchFor(this.instance.usage(), rspecFixtures.instanceDetailsWithoutPermission());
            });

            it("renders without the workspace usage section", function() {
                expect(this.view.$(".instance_name").text()).toBe("Harry's House of Glamour");
                expect(this.view.$('.actions .workspace_usage')).not.toExist();
            });
        });
    });

    context('when a oracle instance is selected', function() {
        beforeEach(function(){
            this.instance = rspecFixtures.oracleDataSource({name: "Harry's House of Glamour", version: "99.999" });
            this.activityViewStub = stubView("", { className: "activity_list" });
            spyOn(chorus.views, 'ActivityList').andReturn(this.activityViewStub);

            spyOn(chorus.views.Base.prototype, "render").andCallThrough();
            this.view = new chorus.views.InstanceListSidebar();
            chorus.PageEvents.broadcast("instance:selected", this.instance);
            $('#jasmine_content').append(this.view.el);
        });

        it("fetches the activities, instance usage and accounts", function() {
            expect(this.instance.activities()).toHaveBeenFetched();
            expect(this.instance.usage()).toHaveBeenFetched();
            expect(this.instance.accounts()).toHaveAllBeenFetched();
        });

        context("sidebar links", function() {
            beforeEach(function() {
                spyOn(this.view, 'canEditInstance').andReturn(true);
                this.view.render();
            });

            it('doesnt display the add note and edit link', function(){
                expect(this.view.$('.actions')).not.toContainTranslation('actions.add_note');
                expect(this.view.$('.actions')).not.toContainTranslation('instances.sidebar.edit_instance');
            });
        });

        context("when the data has been loaded", function() {
            beforeEach(function() {
                spyOn(chorus.views.Sidebar.prototype, 'postRender');
                this.server.completeFetchFor(this.instance.activities());
                var instanceAccountSet = rspecFixtures.instanceAccountSet();
                instanceAccountSet.models[0].set({owner: {id: this.instance.owner().id}});
                this.server.completeFetchAllFor(this.instance.accounts(), instanceAccountSet.models);
                this.server.completeFetchFor(this.instance.accountForCurrentUser());
            });

            it("displays instance name", function() {
                expect(this.view.$(".instance_name")).toContainText("Harry's House of Glamour");
            });

            it("displays instance type", function() {
                expect(this.view.$(".instance_type")).toContainText("Oracle Database");
            });

            it("calls super in postRender (so that scrolling works)", function() {
                expect(chorus.views.Sidebar.prototype.postRender).toHaveBeenCalled();
            });

            it("renders ActivityList subview", function() {
                expect(this.view.$(".activity_list")).toBeVisible();
            });

            it("populates the ActivityList with the activities", function() {
                expect(chorus.views.ActivityList.mostRecentCall.args[0].collection).toBe(this.instance.activities());
            });

            it("sets the ActivityList displayStyle to without_object", function() {
                expect(chorus.views.ActivityList.mostRecentCall.args[0].displayStyle).toBe('without_object');
            });

            context("when user is an admin or owner of the instance", function() {
                it("displays edit instance link when user is admin", function() {
                    setLoggedInUser({ username: "benjamin", admin: true});
                    this.view.render();
                    expect(this.view.$(".actions .edit_instance")).toExist();
                });

                it("displays edit instance link when user is owner", function() {
                    setLoggedInUser({ username: "benjamin", admin: false});
                    this.instance.set({owner: {id: chorus.session.user().get('id')} });
                    this.view.render();
                    expect(this.view.$(".actions .edit_instance")).toExist();
                });

                it("does not display the delete instance link", function() {
                    expect(this.view.$(".actions .delete_instance")).not.toExist();
                });

                context("when the instance is offline", function() {
                    beforeEach(function() {
                        setLoggedInUser({ username: "benjamin", admin: true});
                        this.instance.set({
                            online: false
                        });
                        this.view.render();
                    });

                    it("does display the edit instance link", function() {
                        expect(this.view.$(".actions .edit_instance")).toExist();
                    });

                    it("does display the edit accounts link", function() {
                        expect(this.view.$("a[data-dialog=InstancePermissions]")).toExist();
                    });
                });
            });

            context("when user is not an admin or owner of the instance", function() {
                beforeEach(function() {
                    setLoggedInUser({ username: "benjamin", admin: false});
                    this.instance.set({owner: {id: "harry"}});
                    this.view.render();
                });

                it("does not display edit instance link when user is neither admin nor owner", function() {
                    expect(this.view.$(".actions .edit_instance")).not.toExist();
                });

                it("does not display the delete instance link", function() {
                    expect(this.view.$(".actions .delete_instance")).not.toExist();
                });
            });

            context("when configuration is clicked", function() {
                beforeEach(function() {
                    expect(this.view.$(".instance_configuration_details")).not.toBeVisible();
                    this.view.$(".tab_control .tabs li[data-name=configuration]").click();
                });

                it("shows configuration", function() {
                    expect(this.view.$(".instance_configuration_details")).not.toHaveClass("hidden");
                    expect(this.view.$(".activity_list")).toHaveClass("hidden");
                });

                describe("for existing instance", function() {
                    context("and the instance has a shared account", function() {
                        beforeEach(function() {
                            var instance = rspecFixtures.oracleDataSource({shared: true});
                            instance.loaded = true;
                            this.view.setInstance(instance);
                            var instanceAccountSet = rspecFixtures.instanceAccountSet();
                            instanceAccountSet.models[0].set({owner: {id: this.instance.owner().id}});
                            this.server.completeFetchFor(instance.accounts(), instanceAccountSet.models);
                            this.server.completeFetchFor(instance.accountForCurrentUser());
                        });

                        it("includes the shared account information", function() {
                            expect(this.view.$(".instance_configuration_details").text().indexOf(t("instances.shared_account"))).not.toBe(-1);
                        });
                    });

                    context("and the instance does not have a shared account", function() {
                        it("does not include the shared account information", function() {
                            this.view.render();
                            expect(this.view.$(".instance_configuration_details").text().indexOf(t("instances.shared_account"))).toBe(-1);
                        });
                    });
                });

                describe("for a new instance", function() {
                    beforeEach(function() {
                        this.view.model = this.view.model.set({ size: "1", port: null, host: null });
                        this.view.render();
                    });

                    it("includes size information", function() {
                        expect(this.view.$(".instance_configuration_details").text().indexOf(t("instances.sidebar.size"))).not.toBe(-1);
                    });

                    it("does not include the port, host, or shared account information", function() {
                        expect(this.view.$(".instance_configuration_details").text().indexOf(t("instances.sidebar.host"))).toBe(-1);
                        expect(this.view.$(".instance_configuration_details").text().indexOf(t("instances.sidebar.port"))).toBe(-1);
                        expect(this.view.$(".instance_configuration_details").text().indexOf(t("instances.shared_account"))).toBe(-1);
                    });
                });
            });

            context("when the instance has a shared account", function() {
                beforeEach(function() {
                    this.instance.set({
                        shared: true
                    });
                    this.instance._accountForCurrentUser = rspecFixtures.instanceAccount();
                    this.view.render();
                });

                it("does not show the 'edit credentials' link", function() {
                    expect(this.view.$(".actions .edit_credentials")).not.toExist();
                });

                it("does not show the 'add credentials' link", function() {
                    expect(this.view.$(".actions .add_credentials")).not.toExist();
                });

                it("displays the instance shared account info", function () {
                    expect(this.view.$(".instance_configuration_details .shared_account_info")).toContainText(this.instance.accountForOwner().get("dbUsername"));
                });

                it("displays edit instance link when user is admin", function() {
                    setLoggedInUser({ username: "benjamin", admin: true});
                    this.view.render();
                    expect(this.view.$(".actions .edit_instance")).toExist();
                });

                it("displays edit instance link when user is owner", function() {
                    setLoggedInUser({ username: "benjamin", admin: false});
                    this.instance.accounts().reset([rspecFixtures.instanceAccount({owner: {id: chorus.session.user().get('id')}})]);
                    this.instance.set({owner: {id: chorus.session.user().get('id')}});
                    this.view.render();
                    expect(this.view.$(".actions .edit_instance")).toExist();
                });

                it("does NOT display the edit instance link when user is not an admin or owner", function() {
                    setLoggedInUser({ username: "benjamin", admin: false});
                    this.view.render();
                    expect(this.view.$(".actions .edit_instance")).not.toExist();
                });

                it("shows shared account information", function() {
                    expect(this.view.$(".account_info")).toContainTranslation("instances.sidebar.is_shared_account");
                });
            });

            context("when the instance does not have a shared account", function() {
                context("when the current user is NOT an admin or owner of the instance", function() {
                    context("when the user does not have an account for the instance", function() {
                        it("shows the 'no access' text and image", function() {
                            expect(this.view.$(".account_info img").attr("src")).toBe("/images/data_sources/no_access.png");
                            expect(this.view.$(".account_info").text().trim()).toMatchTranslation("instances.sidebar.no_access");
                        });

                        it("shows the add credentials link", function() {
                            var addCredentialsLink = this.view.$(".actions a.add_credentials");
                            expect(addCredentialsLink).toExist();
                            expect(addCredentialsLink.data("dialog")).toBe("InstanceAccount");
                            expect(addCredentialsLink.data("title")).toMatchTranslation("instances.account.add.title");
                            expect(addCredentialsLink.text()).toMatchTranslation("instances.sidebar.add_credentials");
                            expect(addCredentialsLink.data("instance")).toBe(this.instance);
                        });

                        it("does not show the 'edit credentials' link", function() {
                            expect(this.view.$(".actions .edit_credentials")).not.toExist();
                        });

                        it("does not show the 'remove credentials' link", function() {
                            expect(this.view.$(".actions .remove_credentials")).not.toExist();
                        });
                    });

                    context("when the user has set up an account for the instance", function() {
                        beforeEach(function() {
                            var account = rspecFixtures.instanceAccount();
                            spyOn(this.instance, 'accountForCurrentUser').andReturn(account);
                            this.view.render();
                        });

                        it("shows the 'access' text and image", function() {
                            expect(this.view.$(".account_info img").attr("src")).toBe("/images/data_sources/access.png");
                            expect(this.view.$(".account_info").text().trim()).toMatchTranslation("instances.sidebar.access");
                        });

                        it("shows the 'remove credentials' link", function() {
                            expect(this.view.$(".actions .remove_credentials").text()).toMatchTranslation("instances.sidebar.remove_credentials");
                            expect(this.view.$(".actions .remove_credentials").data("alert")).toBe("InstanceAccountDelete");
                        });

                        it("shows the 'edit credentials' link", function() {
                            var editCredentialsLink = this.view.$(".actions .edit_credentials");
                            expect(editCredentialsLink).toExist();
                            expect(editCredentialsLink.data("dialog")).toBe("InstanceAccount");
                            expect(editCredentialsLink.data("title")).toMatchTranslation("instances.account.edit.title");
                            expect(editCredentialsLink.text()).toMatchTranslation("instances.sidebar.edit_credentials");
                            expect(editCredentialsLink.data("instance")).toBe(this.instance);
                        });

                        it("does not show the 'add credentials' link", function() {
                            expect(this.view.$(".actions .add_credentials")).not.toExist();
                        });

                        describe("when the user removes their credentials", function() {
                            beforeEach(function() {
                                this.instance.accountForCurrentUser = this.instance.accountForCurrentUser.originalValue;
                                this.instance.accountForCurrentUser().trigger("destroy");
                                this.view.render();
                            });

                            it("shows the add credentials link", function() {
                                expect(this.view.$(".actions .add_credentials")).toExist();
                                expect(this.view.$(".actions .add_credentials").data("dialog")).toBe("InstanceAccount");
                                expect(this.view.$(".actions .add_credentials").data("title")).toMatchTranslation("instances.account.add.title");
                                expect(this.view.$(".actions .add_credentials").text()).toMatchTranslation("instances.sidebar.add_credentials");
                            });
                        });
                    });
                });

                context("when the current user is an admin", function() {
                    beforeEach(function() {
                        var account = rspecFixtures.instanceAccount();
                        spyOn(this.instance, 'accountForCurrentUser').andReturn(account);
                        this.instance.accounts().add([rspecFixtures.instanceAccount(), rspecFixtures.instanceAccount(), rspecFixtures.instanceAccount({id: null})]);
                        setLoggedInUser({ username: "benjamin", admin: true});
                        this.view.render();
                    });

                    it("does not show the individual_account area", function() {
                        expect(this.view.$('.individual_account')).not.toBeVisible();
                    });

                    it("does not show the add/edit/remove credentials links", function() {
                        expect(this.view.$(".actions .remove_credentials")).not.toBeVisible();
                        expect(this.view.$(".actions .edit_credentials")).not.toBeVisible();
                        expect(this.view.$(".actions .add_credentials")).not.toBeVisible();
                    });

                    it("shows the edit_individual_accounts area", function() {
                        var editAccountsSection = this.view.$(".edit_individual_accounts"),
                            editAccountsLink = editAccountsSection.find("a");

                        expect(editAccountsSection).toBeVisible();
                        expect(editAccountsLink).toBeVisible();
                        expect(this.view.$(".individual_accounts_count").text()).toMatchTranslation('instances.sidebar.there_are_x_individual_accounts', {count: 4});
                        expect(editAccountsLink.data("instance")).toBe(this.instance);
                        expect(editAccountsLink.data("dialog")).toBe("InstancePermissions");
                    });
                });
            });
        });
    });


    context("when a hadoop instance is selected", function() {
        beforeEach(function() {
            this.instance = rspecFixtures.hadoopInstance({
                name: "Harry's House of Glamour",
                username: "hadoop",
                groupList: "hadoop",
                owner: {id: chorus.session.user().get('id')}
            });
            this.view = new chorus.views.InstanceListSidebar();
            chorus.PageEvents.broadcast("instance:selected", this.instance);
            this.server.completeFetchFor(this.instance.activities());
        });

        it("does not display edit permissions link", function() {
            expect(this.view.$("a.dialog[data-dialog=InstancePermissions]")).not.toExist();
        });

        it("does display the edit instance link", function() {
            expect(this.view.$(".actions .edit_instance")).toExist();
        });

        it("displays instance type", function() {
            expect(this.view.$(".instance_type")).toContainText("Hadoop");
        });

        it("has a 'add a note' link", function() {
            expect(this.view.$("a[data-dialog=NotesNew]")).toExist();
            expect(this.view.$("a[data-dialog=NotesNew]").text()).toMatchTranslation("actions.add_note");
            expect(this.view.$("a[data-dialog=NotesNew]").data("workfileAttachments")).toBeFalsy();
            expect(this.view.$("a[data-dialog=NotesNew]").data("entityType")).toBe('hadoop_instance');
        });

        it("shows the shared account", function() {
            var shared_account_info = this.instance.get("username") + ", " + this.instance.get("groupList");
            expect(this.view.$(".instance_configuration_details .shared_account_info")).toContainText(shared_account_info);
        });
    });

    context("when a gnip instance is selected", function() {
        beforeEach(function() {
            this.instance = rspecFixtures.gnipInstance({name: "Harry's House of Glamour", username: "gnip" });
            this.view = new chorus.views.InstanceListSidebar();
            chorus.PageEvents.broadcast("instance:selected", this.instance);
            this.server.completeFetchFor(this.instance.activities());
        });

        it("displays instance type", function() {
            expect(this.view.$(".instance_type")).toContainText("Gnip Account");
        });

        it("has a 'add a note' link", function() {
            expect(this.view.$("a[data-dialog=NotesNew]")).toExist();
            expect(this.view.$("a[data-dialog=NotesNew]").text()).toMatchTranslation("actions.add_note");
            expect(this.view.$("a[data-dialog=NotesNew]").data("workfileAttachments")).toBeFalsy();
            expect(this.view.$("a[data-dialog=NotesNew]").data("entityType")).toBe('gnip_instance');
        });

        it("has a 'import stream' link", function() {
            expect(this.view.$("a[data-dialog=ImportGnipStream]")).toExist();
            expect(this.view.$("a[data-dialog=ImportGnipStream]").text()).toMatchTranslation("actions.import_gnip_stream");
        });

        it("shows the shared account", function() {
            var shared_account_info = this.instance.get("username");
            expect(this.view.$(".instance_configuration_details .shared_account_info")).toContainText(shared_account_info);
        });

        it("shows the stream url", function() {
            var shared_account_info = this.instance.get("streamUrl");
            expect(this.view.$(".instance_configuration_details .streamUrl")).toContainText(shared_account_info);
        });
    });
});
