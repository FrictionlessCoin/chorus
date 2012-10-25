describe("chorus.models.Instance", function() {
    beforeEach(function() {
        this.instance = new chorus.models.Instance({id : 1, version: "1234", owner:{firstName: "John", lastName: "Doe", id: 2}})
    });

    describe("#stateIconUrl and #stateText", function() {
        it("works for 'offline' instances", function() {
            this.instance.set({ state: "offline" });
            expect(this.instance.stateIconUrl()).toBe("/images/instances/yellow.png");
            expect(this.instance.stateText()).toMatchTranslation("instances.state.offline");
        });

        it("works for online instances", function() {
            this.instance.set({ state: "online" });
            expect(this.instance.stateIconUrl()).toBe("/images/instances/green.png");
            expect(this.instance.stateText()).toMatchTranslation("instances.state.online");
        });

        it("works for other instances", function() {
            this.instance.set({ state: null });
            expect(this.instance.stateIconUrl()).toBe("/images/instances/yellow.png");
            expect(this.instance.stateText()).toMatchTranslation("instances.state.unknown");
        });
    });

    describe("#version", function() {
        it("returns the correct version number", function() {
            expect(this.instance.version()).toBe("1234");
        });
    });

    describe("#owner", function() {
        it("returns a user", function() {
            var owner = this.instance.owner();
            expect(owner.get("id")).toBe(this.instance.get("owner").id);
            expect(owner.get("username")).toBe(this.instance.get("owner").username);
            expect(owner.displayName()).toBe(this.instance.get("owner").firstName + " " + this.instance.get("owner").lastName);
        });
    });

    describe("#isOwner", function() {
        it("returns true if object has same id", function() {
            var owner = this.instance.owner();
            var otherOwnerUser = rspecFixtures.user({id: owner.get('id')});
            expect(this.instance.isOwner(otherOwnerUser)).toBeTruthy();
        });
        it("returns false if id is different", function() {
            var otherOwnerUser = rspecFixtures.user({id: 'notanowner'});
            expect(this.instance.isOwner(otherOwnerUser)).toBeFalsy();
        });
        it("returns false if object is of different type", function() {
            var owner = this.instance.owner();
            var brokenParameter = rspecFixtures.gpdbInstance({id: owner.get('id')});
            expect(this.instance.isOwner(brokenParameter)).toBeFalsy();
        });
    });

    it("returns true for isHadoop", function() {
        expect(this.instance.isHadoop()).toBeFalsy();
    });

    it("returns false for isGreenplum", function() {
        expect(this.instance.isGreenplum()).toBeFalsy();
    });

    it("returns false for isGnip", function() {
        expect(this.instance.isGnip()).toBeFalsy();
    });

    it("returns null for accountForCurrentUser", function() {
        expect(this.instance.accountForCurrentUser()).toBeNull();
    });

    it("returns empty array for accountForCurrentUser", function() {
        expect(this.instance.accounts()).toEqual([]);
    });

    it("returns false for usage", function() {
        expect(this.instance.usage()).toBeFalsy();
    });
});
