describe("chorus.models.Database", function() {
    beforeEach(function() {
        this.model = rspecFixtures.database({ id: '2', name: "love_poems", instance: {id: '1', name: "insta_whip"} });
    });

    describe("#urlTemplate", function() {
        it("should have the correct show url", function() {
            expect(this.model.showUrl()).toMatchUrl("#/databases/2");
        });
    });

    describe("#instance", function() {
        it("returns a data source with the right id and name", function() {
            expect(this.model.instance().id).toEqual('1');
            expect(this.model.instance().name()).toEqual('insta_whip');
        });

        it("memoizes", function() {
            expect(this.model.instance()).toBe(this.model.instance());
        });
    });

    describe("#schemas", function() {
        beforeEach(function() {
            this.schemas = this.model.schemas();
        });

        it("returns a schema set with the right database id", function() {
            expect(this.schemas).toBeA(chorus.collections.SchemaSet);
            expect(this.schemas.attributes.databaseId).toBe("2");
        });

        it("memoizes", function() {
            expect(this.schemas).toBe(this.model.schemas());
        });
    });

    it("includes InstanceCredentials mixin", function() {
        expect(this.model.instanceRequiringCredentials).toBeTruthy();
    });
});
