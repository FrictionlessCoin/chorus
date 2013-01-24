describe("chorus.models.InstanceOwnership", function() {
    beforeEach(function() {
        this.model = new chorus.models.InstanceOwnership({instanceId: 1, user_id: 2});
    });

    it("has a valid url", function() {
        expect(this.model.url()).toBe("/gpdb_data_sources/1/owner");
    });

    it("wraps parameters in 'owner'", function() {
        expect(this.model.parameterWrapper).toBe("owner");
    });
});
