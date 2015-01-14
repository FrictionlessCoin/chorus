describe("chorus.models.AbstractDataSource", function() {
    beforeEach(function() {
        this.dataSource = new chorus.models.AbstractDataSource({id : 1, version: "1234", owner:{firstName: "John", lastName: "Doe", id: 2}});
    });

    describe("#providerIconUrl", function () {
        it("has the right providerIconUrl for hawq data sources", function () {
            this.dataSource.set({entityType: "foo"});
            this.dataSource.set({isHawq: true});
            expect(this.dataSource.providerIconUrl()).toBe("/images/data_sources/icon_hawq_data_source.png");
        });

        it("has the right providerIconUrl non hawq data sources", function() {
            this.dataSource.set({entityType: "foo"});
            expect(this.dataSource.providerIconUrl()).toBe("/images/data_sources/icon_foo.png");
        });
    });

    describe("#stateIconUrl and #stateText", function() {
        it('works for offline data sources', function() {
            this.dataSource.set({ online: false });
            expect(this.dataSource.stateIconUrl()).toBe("/images/data_sources/yellow.svg");
            expect(this.dataSource.stateText()).toMatchTranslation("data_sources.state.offline");
        });

        it('works for online data sources', function() {
            this.dataSource.set({ online: true });
            expect(this.dataSource.stateIconUrl()).toBe("/images/data_sources/green.svg");
            expect(this.dataSource.stateText()).toMatchTranslation("data_sources.state.online");
        });
    });

    describe("#version", function() {
        it("returns the correct version number", function() {
            expect(this.dataSource.version()).toBe("1234");
        });
    });

    describe("#owner", function() {
        it("returns a user", function() {
            var owner = this.dataSource.owner();
            expect(owner.get("id")).toBe(this.dataSource.get("owner").id);
            expect(owner.get("username")).toBe(this.dataSource.get("owner").username);
            expect(owner.displayName()).toBe(this.dataSource.get("owner").firstName + " " + this.dataSource.get("owner").lastName);
        });
    });

    describe("#isOwner", function() {
        it("returns true if object has same id", function() {
            var owner = this.dataSource.owner();
            var otherOwnerUser = backboneFixtures.user({id: owner.get('id')});
            expect(this.dataSource.isOwner(otherOwnerUser)).toBeTruthy();
        });
        it("returns false if id is different", function() {
            var otherOwnerUser = backboneFixtures.user({id: 'notanowner'});
            expect(this.dataSource.isOwner(otherOwnerUser)).toBeFalsy();
        });
        it("returns false if object is of different type", function() {
            var owner = this.dataSource.owner();
            var brokenParameter = backboneFixtures.gpdbDataSource({id: owner.get('id')});
            expect(this.dataSource.isOwner(brokenParameter)).toBeFalsy();
        });
    });

    it("returns false for canHaveIndividualAccounts", function() {
        expect(this.dataSource.canHaveIndividualAccounts()).toBeFalsy();
    });

    it("returns true for isHadoop", function() {
        expect(this.dataSource.isHadoop()).toBeFalsy();
    });

    it("returns false for isGreenplum", function() {
        expect(this.dataSource.isGreenplum()).toBeFalsy();
    });

    it("returns false for isGnip", function() {
        expect(this.dataSource.isGnip()).toBeFalsy();
    });

    it("returns null for accountForCurrentUser", function() {
        expect(this.dataSource.accountForCurrentUser()).toBeNull();
    });

    it("returns empty array for accountForCurrentUser", function() {
        expect(this.dataSource.accounts()).toEqual([]);
    });

    it("returns false for usage", function() {
        expect(this.dataSource.usage()).toBeFalsy();
    });
});
