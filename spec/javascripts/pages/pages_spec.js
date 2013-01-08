describe("chorus.pages.Base", function() {
    beforeEach(function() {
        chorus.user = new chorus.models.User({
            "firstName": "Daniel",
            "lastName": "Burkes",
            "fullName": "Daniel Francis Burkes"
        });

    });

    describe("initialize", function() {
        beforeEach(function() {
            spyOn(chorus.user, "bind");
            spyOn($.fn, "bind").andCallThrough();
            this.view = new chorus.pages.Base();
            this.view.mainContent = stubView();
        });

        it("binds to change on chorus.user", function() {
            expect(chorus.user.bind).toHaveBeenCalledWith("change", this.view.render, this.view);
        });
    });

    describe("#dependOn", function() {
        context("when resource is not found", function() {
            beforeEach(function() {
                this.page = new chorus.pages.Bare();
                this.model = new chorus.models.Base();
                spyOn(this.page, "dependentResourceNotFound");
                this.page.dependOn(this.model);
            });

            it("calls dependentResourceNotFound", function() {
                this.model.trigger("resourceNotFound");
                expect(this.page.dependentResourceNotFound).toHaveBeenCalled();
            });
        });

        context("when resource is forbidden", function() {
            beforeEach(function() {
                this.page = new chorus.pages.Bare();
                this.model = new chorus.models.Base();
                spyOn(this.page, "dependentResourceForbidden");
                this.page.dependOn(this.model);
            });

            it("calls dependentResourceForbidden", function() {
                this.model.trigger("resourceForbidden");
                expect(this.page.dependentResourceForbidden).toHaveBeenCalled();
            });
        });

        context("when a function is provided", function() {
            beforeEach(function() {
                this.page = new chorus.pages.Bare();
                this.model = new chorus.models.Base();
            });

            context("and the dependence is already loaded", function() {
                beforeEach(function() {
                    expect(this.page.foo).toBeUndefined();
                    this.model.loaded = true;
                    this.page.dependOn(this.model, function() {this.foo = true;});
                });

                it("calls the function immediately", function() {
                    expect(this.page.foo).toBeTruthy();
                });
            });

            context("once the dependency is loaded", function() {
                beforeEach(function() {
                    this.page.dependOn(this.model, function() {this.foo = true;});
                });

                it("calls the function ", function() {
                    expect(this.page.foo).toBeUndefined();
                    this.model.trigger("loaded");
                    expect(this.page.foo).toBeTruthy();
                });
            });
        });

        context("when the entity is unprocessable", function() {
            beforeEach(function() {
                this.page = new chorus.pages.Bare();
                this.model = new chorus.models.Base();
                spyOn(this.page, "unprocessableEntity");
                this.page.dependOn(this.model);
            });

            it("calls unprocessableEntity", function() {
                this.model.trigger("unprocessableEntity");
                expect(this.page.unprocessableEntity).toHaveBeenCalled();
            });

            context("when given a special error message", function() {
                beforeEach(function() {
                    this.page = new chorus.pages.Bare();
                    chorus.pageOptions = {};
                    this.model.serverErrors = { record: "INSTANCE_OVERLOADED" };
                    this.page.dependOn(this.model);
                });

                it("has the right translations", function() {
                    this.model.trigger("unprocessableEntity");
                    expect(chorus.pageOptions.title).toMatchTranslation("record_error.INSTANCE_OVERLOADED_title");
                    expect(chorus.pageOptions.text).toMatchTranslation("record_error.INSTANCE_OVERLOADED");
                });
            });

            context("when given a generic error message", function() {
                beforeEach(function() {
                    this.page = new chorus.pages.Bare();
                    chorus.pageOptions = {};
                    this.model.serverErrors = { message: "Bad things happened." };
                    this.page.dependOn(this.model);
                });

                it("displays the error message it was given", function() {
                    this.model.trigger("unprocessableEntity");
                    expect(chorus.pageOptions.title).toMatchTranslation("unprocessable_entity.unidentified_error.title");
                    expect(chorus.pageOptions.text).toBe("Bad things happened.");
                });
            });
        });
    });

    describe("#render", function() {
        beforeEach(function() {
            this.view = new chorus.pages.Base();

            this.view.mainContent = stubView();
        });

        context("when the page already has a header", function() {
            it("uses the cached header", function() {
                var header = stubView("I is yr header");
                this.view.header = header;
                this.view.render();
                expect(this.view.$("#header").text()).toBe("I is yr header");
            });
        });

        context("when the page does not have a header", function() {
            it("creates a Header view", function() {
                this.view.render();
                expect(this.view.$("#header.header")).toExist();
                expect(this.view.header).toBeA(chorus.views.Header);
            });
        });

        context("when the page has a 'workspaceId'", function() {
            beforeEach(function() {
                this.view.workspaceId = '5';
                this.view.render();
            });

            it("passes the workspace id to the header", function() {
                expect(this.view.header.options.workspaceId).toBe("5");
            });
        });

        context("when the page depends on resources", function() {
            beforeEach(function() {
                this.resource = rspecFixtures.user();
                this.view.dependOn(this.resource);
            });

            context("when the fetch returns not found", function() {
                beforeEach(function() {
                    spyOn(Backbone.history, "loadUrl");
                    spyOn(this.view, "failurePageOptions").andReturn({foo: "bar"});
                    this.resource.trigger("resourceNotFound");
                });

                it("navigates to the InvalidRoutePage if requiredResource fetch fails", function() {
                    expect(chorus.pageOptions).toEqual({ foo: "bar" });
                    expect(Backbone.history.loadUrl).toHaveBeenCalledWith("/invalidRoute");
                });
            });

            context("when the fetch returns forbidden", function() {
                beforeEach(function() {
                    spyOn(Backbone.history, "loadUrl");
                    spyOn(this.view, "failurePageOptions").andReturn({foo: "bar"});
                    this.resource.trigger("resourceForbidden");
                });

                it("navigates to the InvalidRoutePage if requiredResource fetch fails", function() {
                    expect(chorus.pageOptions).toEqual({ foo: "bar" });
                    expect(Backbone.history.loadUrl).toHaveBeenCalledWith("/unauthorized");
                });
            });

            context("when the fetch returns forbidden and has a type", function() {
                beforeEach(function() {
                    spyOn(Backbone.history, "loadUrl");
                    spyOn(this.view, "failurePageOptions").andReturn({foo: "bar"});
                    this.resource.serverErrors = {message: "error message", type: "SqlPermissionDenied" };
                    this.resource.trigger("resourceForbidden");
                });

                it("navigates to the InvalidRoutePage if requiredResource fetch fails", function() {
                    expect(chorus.pageOptions).toEqual({ foo: "bar" });
                    expect(Backbone.history.loadUrl).toHaveBeenCalledWith("/forbidden");
                });
            });

            context("when the fetch returns unprocessableEntity", function() {
                beforeEach(function() {
                    spyOn(Backbone.history, "loadUrl");
                    spyOn(this.view, "failurePageOptions").andReturn({foo: "bar"});
                    this.resource.trigger("unprocessableEntity");
                });

                it("navigates to the UnprocessableEntityPage if requiredResource fetch returns 422", function() {
                    expect(chorus.pageOptions).toEqual({ foo: "bar" });
                    expect(Backbone.history.loadUrl).toHaveBeenCalledWith("/unprocessableEntity");
                });

                context("when the errors include a record key", function() {
                    beforeEach(function() {
                        this.resource.serverErrors = {record: 'TOO_MANY_CONNECTIONS', message: 'something is broken'};
                        this.resource.trigger("unprocessableEntity");
                    });

                    it("sets the pageOptions to the correct translation", function() {
                        expect(chorus.pageOptions.text).toMatchTranslation('record_error.TOO_MANY_CONNECTIONS');
                        expect(chorus.pageOptions.title).toMatchTranslation('record_error.TOO_MANY_CONNECTIONS_title');
                    });
                });

                context("when the error key does not have a title", function() {
                    beforeEach(function() {
                        this.resource.serverErrors = {record: 'FAKE_ERROR', message: 'something is broken'};
                        this.resource.trigger("unprocessableEntity");
                    });

                    it("sets the pageOptions title to a generic message", function() {
                        expect(chorus.pageOptions.title).toMatchTranslation('unprocessable_entity.unidentified_error.title');
                    });
                });

                context("when the errors do not have a record key", function() {
                    beforeEach(function() {
                        this.resource.serverErrors = {message: 'something is broken'};
                        this.resource.trigger("unprocessableEntity");
                    });

                    it("sets the pageOptions to be the error message", function() {
                        expect(chorus.pageOptions.text).toEqual('something is broken');
                        expect(chorus.pageOptions.title).toMatchTranslation('unprocessable_entity.unidentified_error.title');
                    });
                });
            });
        });

        describe("breadcrumb handling", function() {
            context("with static breadcrumbs", function() {
                beforeEach(function() {
                    this.view.crumbs = [
                        {label: "Home"}
                    ];
                    this.view.render();
                });

                it("creates a BreadcrumbsView with the static breadcrumbs", function() {
                    expect(this.view.breadcrumbs.options.breadcrumbs).toEqual(this.view.crumbs);
                });
            });

            context("with dynamic breadcrumbs", function() {
                beforeEach(function() {

                    this.view.crumbs = jasmine.createSpy("crumbs").andCallFake(function() {
                        return [
                            {label: "There"}
                        ];
                    });
                    this.view.render();
                });

                it("creates a BreadcrumbsView with the dynamic breadcrumbs", function() {
                    expect(this.view.breadcrumbs.options.breadcrumbs).toEqual(this.view.crumbs());
                });

                it("re-evaluates the function every time render is called", function() {
                    expect(this.view.crumbs).toHaveBeenCalled();
                    this.view.crumbs.reset();
                    this.view.render();
                    expect(this.view.crumbs).toHaveBeenCalled();
                });
            });
        });

        it("renders the breadcrumbs", function() {
            this.view.crumbs = [
                {label: "Home"}
            ];
            this.view.render();
            expect(this.view.$("#breadcrumbs.breadcrumbs .breadcrumb")).toExist();
        });

        it("populates the #main_content", function() {
            this.view.mainContent = stubView("OH HAI BARABARA");

            this.view.render();

            expect(this.view.$("#main_content").text()).toBe("OH HAI BARABARA");
        });

        it("creates a Sidebar view", function() {
            this.view.sidebar = stubView("VROOOOOOOOOM");
            this.view.render();
            expect(this.view.$("#sidebar .sidebar_content.primary").text()).toBe("VROOOOOOOOOM");
        });

        it("makes an empty sidebar when not provided with a sideBarContent function", function() {
            this.view.render();
            delete this.view.sidebar;
            this.view.render();
            expect(this.view.$("#sidebar.sidebar_content.primary").text().length).toBe(0);
        });
    });

    context("dialogs and alerts", function() {
        function itLaunchesTheModalCorrectly(modalClass) {
            it("instantiates modals from buttons", function() {
                this.elementToClick.click();
                expect(this.modalSpy).toHaveModal(modalClass);
            });

            it("passes the data attributes on the clicked element to the modal as options", function() {
                this.elementToClick.data({ foo: 5, bar: 8 });
                this.elementToClick.click();
                expect(this.modalSpy.lastModal().options.foo).toBe(5);
                expect(this.modalSpy.lastModal().options.bar).toBe(8);
            });

            it("passes the pageModel to the modal", function() {
                this.view.model = new chorus.models.User();
                this.elementToClick.click();
                expect(this.modalSpy.lastModal().options.pageModel).toBe(this.view.model);
            });
        }

        beforeEach(function() {
            this.modalSpy = stubModals();

            this.view = new chorus.pages.Base();
            chorus.page = this.view;
            this.view.mainContent = stubView();
            chorus.bindModalLaunchingClicks(this.view);
        });

        context("from buttons", function() {
            beforeEach(function() {
                this.view.sidebar = stubView("<button type='button' class='alert' data-alert='NoLdapUser'>Create a Foo</button>");
                this.view.render();
                this.elementToClick = this.view.$("button.alert");
            });

            itLaunchesTheModalCorrectly(chorus.alerts.NoLdapUser);
        });

        context("from links", function() {
            beforeEach(function() {
                this.view.sidebar = stubView("<a class='dialog' data-dialog='WorkfilesSqlNew'>Create a Workfile</a>");
                this.view.render();
                this.elementToClick = this.view.$("a.dialog");
            });

            itLaunchesTheModalCorrectly(chorus.dialogs.WorkfilesSqlNew);
        });
    });

    describe("help", function() {
        beforeEach(function() {
            spyOn(chorus, "help");
            chorus.page = this.page = new chorus.pages.Base();
            chorus.bindModalLaunchingClicks(this.page);
            this.page.render();
            this.page.$("#help a").click();
        });

        it("shows the help system", function() {
            expect(chorus.help).toHaveBeenCalled();
        });
    });
});
