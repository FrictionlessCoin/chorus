describe("chorus.pages.NotLicensedPage", function() {
    beforeEach(function() {
        this.page = new chorus.pages.NotLicensedPage();
        this.page.render();
    });

    it("has the translations for the title", function() {
        expect(this.page.$('.heading')).toContainTranslation("not_licensed.title");
    });

    it("has the translations for the textbox content", function() {
        expect(this.page.$('.content')).toContainTranslation("not_licensed.text");
    });
});
