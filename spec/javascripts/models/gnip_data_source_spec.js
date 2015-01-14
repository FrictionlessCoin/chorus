describe("chorus.models.GnipDataSource", function() {
    beforeEach(function() {
        this.model = backboneFixtures.gnipDataSource({id: 123});
        this.attrs = {
            name: "someName",
            streamUrl: "someUrl",
            username: "myusername",
            password: "password"
        };
    });

    it("has the right url", function() {
        expect(this.model.url()).toBe("/gnip_data_sources/123");
    });

    it("is shared", function() {
        expect(this.model.isShared()).toBeTruthy();
    });

    it("has the right showUrlTemplate", function() {
        expect(this.model.showUrl()).toBe("#/gnip_data_sources/123");
    });

    it("has the correct entityType", function() {
        expect(this.model.entityType).toBe("gnip_data_source");
    });

    it("returns true for isGnip", function() {
        expect(this.model.isGnip()).toBeTruthy();
    });

    _.each(["name", "streamUrl", "username"], function(attr) {
        it("requires " + attr, function() {
            this.attrs[attr] = "";
            expect(this.model.performValidation(this.attrs)).toBeFalsy();
            expect(this.model.errors[attr]).toBeTruthy();
        });
    });

    it("requires name with valid length", function() {
        this.attrs.name = "testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest";
        expect(this.model.performValidation(this.attrs)).toBeFalsy();
        expect(this.model.errors.name).toMatchTranslation("validation.required_pattern", {fieldName: "name"});
    });

    it("doesn't require a password if already saved", function () {
        this.attrs.password = "";
        expect(this.model.performValidation(this.attrs)).toBeTruthy();
    });

    it('requires a password if a new data source', function () {
        this.model.unset("id");
        this.attrs.password = "";
        expect(this.model.performValidation(this.attrs)).toBeFalsy();
    });

    describe("#sharedAccountDetails", function() {
        it('returns the account name of the user who owns the data source and shared it', function() {
            var sharedAccountDetails = this.model.get("username");
            expect(this.model.sharedAccountDetails()).toBe(sharedAccountDetails);
        });
    });

    describe("#stateText", function() {
        it("returns online", function() {
            expect(this.model.stateText()).toEqual("Online");
        });
    });

    describe("#stateIconUrl", function() {
        it("returns the online icon url", function() {
            expect(this.model.stateIconUrl()).toEqual("/images/data_sources/green.svg");
        });
    });
});