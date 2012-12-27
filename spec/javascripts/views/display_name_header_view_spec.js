describe("chorus.views.DisplayNameHeader", function() {
    beforeEach(function() {
        this.model = rspecFixtures.user();
        this.view = new chorus.views.DisplayNameHeader({ model : this.model });
    });

    describe("#render", function() {
        context("when the model is not loaded", function() {
            beforeEach(function() {
                this.model.loaded = undefined;
                this.view.render();
            });

            it("does not display anything", function() {
                expect(this.view.$("h1").text().trim()).toBe("");
            });
        });

        context("when the model is loaded", function() {
            beforeEach(function() {
                this.model.loaded = true;
                this.view.render();
            });

            it("shows the dipslay name", function() {
                expect(this.view.$("h1").text().trim()).toBe(this.model.displayName());
            });
        });
    });
});
