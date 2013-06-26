describe('chorus.handlebarsHelpers.template', function() {
    describe("renderTemplate", function () {
        it("renders the template", function () {
            expect(Handlebars.helpers.renderTemplate('plain_text', {text:'foo'}).toString().trim()).toBe('foo');
        });
    });

    describe("renderTemplateIf", function () {
        beforeEach(function () {
            this.template = '{{renderTemplateIf condition "plain_text" this }}';
        });

        it("renders the template if the condition is truthy", function () {
            var output = Handlebars.compile(this.template)({ condition:true, text:"hello" });
            expect(output).toContainText("hello");
        });

        it("does not render the template if the condition is falsy", function () {
            var output = Handlebars.compile(this.template)({ condition:false, text:"hello" });
            expect(output).toBe("");
        });
    });

    describe("spanFor", function() {
        it("wraps text in span and applies attributes", function() {
            var span = Handlebars.helpers.spanFor("text", {'class': 'my_class'}).toString();
            expect(span).toEqual('<span class="my_class">text</span>');
        });

        it("escapes the text", function() {
            var span = Handlebars.helpers.spanFor("<span>text</span>").toString();
            expect(span).toEqual('<span>&lt;span&gt;text&lt;/span&gt;</span>');
        });

        it("should return a safe string", function() {
            expect(Handlebars.helpers.spanFor("text")).toBeA(Handlebars.SafeString);
        });
    });

    describe("hdfsDataSourceFields", function() {
        beforeEach(function() {
            spyOn(Handlebars.helpers, "renderTemplate");
        });

        it("renders the template for hdfs data source with the passed context", function() {
            Handlebars.helpers.hdfsDataSourceFields({param_one: "param"});
            expect(Handlebars.helpers.renderTemplate).toHaveBeenCalledWith("data_sources/hdfs_data_source_fields", {param_one: "param"});
        });

        it("renders the template for hdfs data source with an empty context when none is specified", function() {
            Handlebars.helpers.hdfsDataSourceFields();
            expect(Handlebars.helpers.renderTemplate).toHaveBeenCalledWith("data_sources/hdfs_data_source_fields", {});
        });
    });

    describe("hdfsVersionsSelect", function() {
        beforeEach(function() {
            this.versions = chorus.models.Config.instance().get("hdfsVersions");
            spyOn(Handlebars.helpers, "renderTemplate");
        });

        it("renders the template for hdfs data source with the passed context", function() {
            Handlebars.helpers.hdfsVersionsSelect(false);
            expect(Handlebars.helpers.renderTemplate).toHaveBeenCalledWith("data_sources/hdfs_versions_select", {
                selectOne: false,
                hdfsVersions: this.versions
            });
        });

        it("renders the template for hdfs data source with an empty context when none is specified", function() {
            Handlebars.helpers.hdfsVersionsSelect();
            expect(Handlebars.helpers.renderTemplate).toHaveBeenCalledWith("data_sources/hdfs_versions_select", {
                selectOne: true,
                hdfsVersions: this.versions
            });
        });
    });
});