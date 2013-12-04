describe("chorus.views.Login", function() {
    beforeEach(function() {
        stubDefer();
        spyOn($.fn, 'focus');
        this.view = new chorus.views.Login({model: chorus.session});
        this.view.render();
    });

    it("should have a login form", function() {
        expect(this.view.$("form.login")).toExist();
    });

    it("does not autocomplete inputs", function(){
        expect(this.view.$("input[name=username]")).toHaveAttr("autocomplete", "off");
        expect(this.view.$("input[type=password]")).toHaveAttr("autocomplete", "off");
    });

    it("requests the version string from the server", function() {
        expect(this.server.requests[0].url).toHaveUrlPath("/VERSION");
    });

    it("uses a cache buster when requesting the version string", function() {
        expect(this.server.requests[0].url.match(/buster=/)).toBeTruthy();
    });

    it("focuses the username field by default", function() {
        expect($.fn.focus).toHaveBeenCalled();
        expect($.fn.focus.mostRecentCall.object).toBe("input[name='username']");
    });

    describe("when the version string is returned", function() {
        beforeEach(function() {
            this.version = "0123456789ABCDEF012";
            this.server.requests[0].respond(200, {}, this.version);
        });

        it("inserts the version string", function() {
            expect(this.view.$(".legal .version")).toHaveText(this.version);
        });

        it("limits the version to 19 characters", function() {
            this.server.requests[0].respond(200, {}, "0123456789ABCDEF012345");
            expect(this.view.$(".legal .version")).toHaveText("0123456789ABCDEF012");
        });

        it("sets the version title to the full version", function() {
            expect(this.view.$(".legal .version").attr('title')).toBe("Version " + this.version);
        });
    });

    describe("attempting to login", function() {
        beforeEach(function() {
            this.view.model.set({ foo: "bar" });
            this.view.model.id = "foo";
            this.saveSpy = spyOn(this.view.model, "save");
            this.view.$("input[name=username]").val("johnjohn");
            this.view.$("input[name=password]").val("partytime");
            this.view.$("form.login").submit();
        });

        it("sets attributes on the model", function() {
            expect(this.view.model.get("username")).toBe("johnjohn");
            expect(this.view.model.get("password")).toBe("partytime");
        });

        it("clears other attributes on the model", function() {
            expect(_.size(this.view.model.attributes)).toBe(2);
        });

        it("configures the model for POST, not PUT", function() {
            expect(this.view.model.isNew()).toBeTruthy();
        });

        it("attempts to save the model", function() {
            expect(this.saveSpy).toHaveBeenCalled();
        });
    });

    describe("when the login fails", function() {
        beforeEach(function() {
            this.view.model.serverErrors = { fields: { a: { BLANK: {} } } };
            this.view.render();
        });

        it("displays the error message", function() {
            expect(this.view.$(".errors").text()).toContain("A can't be blank");
        });
    });

    describe("when the login succeeds", function() {
        beforeEach(function() {
            this.navigationSpy = spyOn(chorus.router, "navigate");
        });

        context("with no prior logins", function() {
            beforeEach(function() {
                this.view.model.trigger('saved', this.view.model);
            });

            it("navigates to the dashboard", function() {
                expect(this.navigationSpy).toHaveBeenCalledWith("/");
            });
        });

        context("with a prior login", function() {
            beforeEach(function() {
                chorus.session._previousUserId = "2";
                chorus.session._pathBeforeLoggedOut = "/foo";
            });

            context("from the same user that timed out", function() {
                beforeEach(function() {
                    chorus.session.user().set('id', '2');

                    this.view.model.trigger('saved', this.view.model);
                });

                it("navigates to the page before forced logout", function() {
                    expect(this.navigationSpy).toHaveBeenCalledWith("/foo");
                });
            });

            context("from a different user that timed out", function() {
                beforeEach(function() {
                    chorus.session.user().set('id', '3');

                    this.view.model.trigger('saved', this.view.model);
                });

                it("navigates to the page before forced logout", function() {
                    expect(this.navigationSpy).toHaveBeenCalledWith("/foo");
                });
            });
        });

    });
});
