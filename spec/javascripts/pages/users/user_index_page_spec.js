describe("chorus.pages.UserIndexPage", function() {
    beforeEach(function() {
        chorus.user = new chorus.models.User({
            "firstName" : "Daniel",
            "lastName" : "Burkes",
            "fullName": "Daniel Francis Burkes"
        });
    });

    describe("#initialize", function() {
        beforeEach(function() {
            this.page = new chorus.pages.UserIndexPage();
        })

        it("defaults to first name sorting ascending", function() {
            expect(this.page.collection.order).toBe("firstName")
        })

        it("has a helpId", function() {
            expect(this.page.helpId).toBe("users")
        })
    })

    describe("#render", function() {
        beforeEach(function() {
            this.view = new chorus.pages.UserIndexPage();
            this.view.render();
        })

        it("has the right header title", function() {
            expect(this.view.$(".content_header h1").text()).toBe("Users");
        })

        it("defaults to first name sorting", function() {
            expect(this.view.$("li[data-type=lastName] .check")).toHaveClass("hidden");
            expect(this.view.$("li[data-type=firstName] .check")).not.toHaveClass("hidden");
        })

        describe("when the collection is loading", function() {
            it("should have a loading element", function() {
                expect(this.view.$(".loading")).toExist();
            });

            it("has a header", function() {
                expect(this.view.$("h1")).toExist();
            })
        });

        it("creates a UserList view", function() {
            expect(this.view.$(".user_list")).toExist();
        });

        describe("when the authenticated user is an admin", function() {
            beforeEach(function() {
                setLoggedInUser({ admin: true});
                this.view = new chorus.pages.UserIndexPage();
                this.view.render();
            })

            it("displays an 'add user' button", function() {
                expect(this.view.$("a.button[href=#/users/new]")).toExist();
            })
        });

        describe("when the authenticated user is not an admin", function() {
            beforeEach(function() {
                chorus.user.set({ admin: false });
                this.view = new chorus.pages.UserIndexPage();
                this.view.render();
            })

            it("does not display an 'add user' button", function() {
                expect(this.view.$("a[href=#/users/new] button")).not.toExist();
            })
        });
    })

    describe("menus", function() {
        beforeEach(function() {
            this.page = new chorus.pages.UserIndexPage();
            this.page.render();
        })

        describe("sorting", function() {
            beforeEach(function() {
                this.page.collection.order = undefined;
                spyOn(this.page.collection, "fetch");
            });

            it("has options for sorting", function() {
                expect(this.page.$("ul[data-event=sort] li[data-type=firstName]")).toExist();
                expect(this.page.$("ul[data-event=sort] li[data-type=lastName]")).toExist();
            });

            it("can sort the list by first name ascending", function() {
                this.page.$("li[data-type=firstName] a").click();
                expect(this.page.collection.order).toBe("firstName")
                expect(this.page.collection.fetch).toHaveBeenCalled();
            });

            it("can sort the list by last name ascending", function() {
                this.page.$("li[data-type=lastName] a").click();
                expect(this.page.collection.order).toBe("lastName")
            });
        });
    });

    describe("setting the model on a page event", function() {
        beforeEach(function() {
            this.page = new chorus.pages.UserIndexPage();
            this.page.render();

            this.user = rspecFixtures.user({ firstName: "Super", lastName: "Man" });
        });

        it("sets the model to user on a user:selected event", function() {
            expect(this.page.model).toBeUndefined();
            chorus.PageEvents.broadcast("user:selected", this.user);
            expect(this.page.model).toBe(this.user);
        });
    });
});
