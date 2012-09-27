describe("chorus.dialogs.PickWorkspace", function() {
    beforeEach(function() {
        setLoggedInUser({id: 4003});
        chorus.session.trigger("saved")
        spyOn(chorus.dialogs.PickItems.prototype, "submit").andCallThrough();
        this.dialog = new chorus.dialogs.PickWorkspace();
    });

    describe("#setup", function() {
        it("fetches all the workspaces", function() {
            expect(this.server.lastFetch().url).toBe("/workspaces/?user_id=4003&page=1&per_page=1000");
        })

        it("only gets the chorus.session.users()'s workspaces", function() {
            expect(this.dialog.collection.attributes.userId).toBe(chorus.session.user().get("id"));
        })

        context("when activeOnly is set to true", function() {
            it("only fetches the active workspaces", function() {
                this.dialog = new chorus.dialogs.PickWorkspace({ activeOnly: true });
                expect(this.dialog.collection.attributes.active).toBeTruthy();
            });
        });
    });

    describe("#render", function() {
        beforeEach(function() {
            this.dialog = new chorus.dialogs.PickWorkspace();
            this.dialog.render();
        });

        context("when the fetch completes", function() {
            beforeEach(function() {
                this.server.completeFetchAllFor(this.dialog.collection, [
                    rspecFixtures.workspace({name: "Foo"}),
                    rspecFixtures.workspace({name: "Bar"}),
                    rspecFixtures.workspace({name: "Baz"})
                ]);
            });

            it("has the correct submit button text", function() {
                expect(this.dialog.$("button.submit")).toContainTranslation("dataset.associate.button.one");
            });

            it("renders the name of the workspace", function() {
                expect(this.dialog.$("li").length).toBe(3);
                expect(this.dialog.$("li:eq(0)")).toContainText("Bar");
                expect(this.dialog.$("li:eq(1)")).toContainText("Baz");
                expect(this.dialog.$("li:eq(2)")).toContainText("Foo");
            });

            it("renders the workspace icon", function() {
                expect(this.dialog.$("li:eq(0) img")).toHaveAttr("src", "/images/workspaces/workspace_small.png");
                expect(this.dialog.$("li:eq(1) img")).toHaveAttr("src", "/images/workspaces/workspace_small.png");
                expect(this.dialog.$("li:eq(2) img")).toHaveAttr("src", "/images/workspaces/workspace_small.png");
            });

            describe("typing in the search bar", function() {
                it("filters the list correctly", function() {
                    this.dialog.$("input").val("Bar").trigger("textchange");
                    var listItems = this.dialog.$("ul li");
                    expect(listItems.eq(0)).not.toHaveClass("hidden");
                    expect(listItems.eq(1)).toHaveClass("hidden");
                    expect(listItems.eq(2)).toHaveClass("hidden");
                });
            });

            describe("clicking the choose workspace button", function() {
                beforeEach(function() {
                    this.dialog.$("li:eq(0)").click();
                    this.dialog.$("button.submit").click();
                });

                it("calls the submit callback", function() {
                    expect(this.dialog.submit).toHaveBeenCalled();
                })
            });

            describe("double-clicking a workspace", function() {
                beforeEach(function() {
                    this.dialog.$("li:eq(0)").dblclick();
                });

                it("calls the submit callback", function() {
                    expect(this.dialog.submit).toHaveBeenCalled();
                });
            });
        });
    });
});
