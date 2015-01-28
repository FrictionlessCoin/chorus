describe("handlebars partials", function () {
    describe("errorDiv", function() {
        context("when context.serverErrors is undefined", function() {
            beforeEach(function() {
                this.context = {};
            });

            it("renders a hidden empty div (1)", function() {
                var el = Handlebars.VM.invokePartial(Handlebars.partials.errorDiv, "errorDiv", this.context, Handlebars.helpers, Handlebars.partials);
                expect(el.html()).toContain('<div class="errors hidden">');
            });

            it("renders a hidden empty div (2)", function() {
                var el = Handlebars.VM.invokePartial(Handlebars.partials.errorDiv, "errorDiv", this.context, Handlebars.helpers, Handlebars.partials);
                expect(el.view.$("div.errors.hidden")).toExist();
            });

            it("renders a hidden empty div (3)", function() {
                var el = Handlebars.VM.invokePartial(Handlebars.partials.errorDiv, "errorDiv", this.context, Handlebars.helpers, Handlebars.partials);
                expect(el.$("div")).toHaveClass("hidden");
            });
            it("renders a hidden empty div (4)", function() {
                var el = Handlebars.VM.invokePartial(Handlebars.partials.errorDiv, "errorDiv", this.context, Handlebars.helpers, Handlebars.partials);
                expect(el.find("div").html()).toContain('class="errors hidden"');
            });
            
             it("renders a hidden empty div (5)", function() {
                var el = Handlebars.VM.invokePartial(Handlebars.partials.errorDiv, "errorDiv", this.context, Handlebars.helpers, Handlebars.partials);
                expect(el).toContain('<div class="errors hidden">');
            });
                       
            
        });

        context("when context.serverErrors has fields", function() {
            beforeEach(function() {
                this.context = {
                    serverErrors: {
                        fields: {
                            username_or_password: {
                                INVALID: {}
                            },
                            password: {
                                BLANK: {}
                            },
                            database: {
                                GENERIC: {
                                    message: "<script>alert('injection')</script>"
                                }
                            }
                        }
                    }
                };
            });

            it("renders the messages", function() {
                var el = $(Handlebars.VM.invokePartial(Handlebars.partials.errorDiv, "errorDiv", this.context, Handlebars.helpers, Handlebars.partials));
                expect(el.find("li").length).toBe(3);
                expect(el.find("li:eq(0)").text()).toContain("Username or password is invalid");
                expect(el.find("li:eq(1)").text()).toContain("Password can't be blank");
            });

            it("escapes the error messages", function() {
                var el = $(Handlebars.VM.invokePartial(Handlebars.partials.errorDiv, "errorDiv", this.context, Handlebars.helpers, Handlebars.partials));
                expect(el.find("li:eq(2)").html()).toContain("&lt;script&gt;alert('injection')&lt;/script&gt;");
            });
        });
    });
});
