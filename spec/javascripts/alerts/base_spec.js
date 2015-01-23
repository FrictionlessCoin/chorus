describe("chorus.alerts.Base", function() {
    beforeEach(function() {
        spyOn(chorus.alerts.Base.prototype, "cancelAlert").andCallThrough();
        this.model = new chorus.models.Base({ id: "foo"});
        this.alert = new chorus.alerts.Base({ model: this.model });
        this.alert.title = "OH HAI";
        this.alert.text = "How are you?";
        this.alert.render();
    });

    describe("#render", function() {
        it("hides the submit button", function() {
            expect(this.alert.$("button.submit")).toHaveClass("hidden");
        });

        it("displays the title", function() {
            expect(this.alert.$("h1").text()).toBe("OH HAI");
        });

        it("displays the text", function() {
            expect(this.alert.$("p").text()).toBe("How are you?");
        });

        it("displays the icon", function() {
            expect(this.alert.$("img")).toHaveAttr("src", "/images/messaging/message_icon.png");
        });

        it("displays the default cancel text on the cancel button", function() {
            expect(this.alert.$("button.cancel").text()).toMatchTranslation("actions.cancel");
        });

        it("should not render the body section", function() {
            expect(this.alert.$(".body")).not.toExist();
        });

        context("when a message body is provided", function() {
            beforeEach(function() {
                this.alert.body = "Hello World!";
                this.alert.render();
            });

            it("should show the body section", function() {
                expect(this.alert.$(".body")).toExist();
                expect(this.alert.$(".body").text().trim()).toBe("Hello World!");
            });
        });

        context("when a custom cancel is provided", function() {
            beforeEach(function() {
                this.alert.cancel = "Don't do it!";
                this.alert.render();
            });

            it("displays the 'cancel' text on the cancel button", function() {
                expect(this.alert.$("button.cancel").text()).toBe("Don't do it!");
            });
        });

        it("displays server errors", function() {
            this.alert.resource.set({serverErrors: { fields: { connection: { INVALID: { message: "Couldn't find host/port to connect to" } } } }});
            this.alert.render();

            expect(this.alert.$(".errors").text()).toContain("Couldn't find host/port to connect to");
        });
    });

    describe("#launchModal", function() {
        beforeEach(function() {
            delete chorus.modal;
            spyOn($, "facebox");
            spyOn(this.alert, "render");
            this.alert.launchModal();
        });

        it("creates a facebox", function() {
            expect($.facebox).toHaveBeenCalledWith(this.alert.el);
        });

        it("renders in the facebox", function() {
            expect(this.alert.render).toHaveBeenCalled();
        });
    });

    describe("Clicking the cancel button", function() {
        beforeEach(function() {
            this.alert.render();
            spyOnEvent($(document), "close.facebox");
            this.alert.$("button.cancel").click();
        });

        it("calls cancelAlert", function() {
            expect(this.alert.cancelAlert).toHaveBeenCalled();
        });

        describe("the default cancelAlert", function() {
            it("dismisses the alert", function() {
                expect("close.facebox").toHaveBeenTriggeredOn($(document));
            });
        });
    });

    describe("on reveal", function() {
        it("focuses on the cancel button", function() {
            spyOn($.fn, 'focus');
            this.alert.render();
            $(document).trigger('reveal.facebox');
            expect($.fn.focus).toHaveBeenCalled();
            expect($.fn.focus.lastCall().object).toBe("button.cancel");
        });
    });
});

