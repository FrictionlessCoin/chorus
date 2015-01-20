describe("chorus.pages.ForbiddenPage", function() {
    beforeEach(function() {
        this.page = new chorus.pages.ForbiddenPage();
        this.page.render();
    });

    it("has the translations for the title", function() {
        expect(this.page.$('.heading')).toContainTranslation("forbidden.title");
    });

    it("has the translations for the textbox content", function() {
        expect(this.page.$('.content')).toContainTranslation("forbidden.text");
    });
});
