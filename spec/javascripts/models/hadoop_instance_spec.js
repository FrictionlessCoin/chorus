describe("chorus.models.HadoopInstance", function() {
    beforeEach(function() {
        this.model = rspecFixtures.hadoopInstance({id : 123, username: "hadoop", groupList: "hadoop"});
        this.attrs = {};
    });

    it("has the right url", function() {
        expect(this.model.url()).toBe("/hadoop_instances/123");
    });

    it("is shared", function() {
        expect(this.model.isShared()).toBeTruthy();
    });

    it("has the correct entityType", function() {
        expect(this.model.entityType).toBe("hadoop_instance");
    });

    it("has the right provider icon url", function() {
        expect(this.model.providerIconUrl()).toBe("/images/instances/icon_datasource_hadoop.png");
    });

    it("links to the root directory of the hadoop instance", function() {
        expect(this.model.showUrl()).toBe("#/hadoop_instances/" + this.model.get('id') + "/browse/");
    });

    it("returns true for isHadoop", function() {
        expect(this.model.isHadoop()).toBeTruthy();
    });

    _.each(["name", "host", "username", "groupList", "port"], function(attr) {
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

    describe("#providerIconUrl", function() {
        it("returns the right url for hadoop instances", function() {
            expect(this.model.providerIconUrl()).toBe("/images/instances/icon_datasource_hadoop.png");
        });
    });

    describe("#sharedAccountDetails", function() {
        it("returns the account name of the user who owns the instance and shared it", function() {
            var sharedAccountDetails = this.model.get("username") + ", " + this.model.get("groupList");
            expect(this.model.sharedAccountDetails()).toBe(sharedAccountDetails);
        });
    });
});