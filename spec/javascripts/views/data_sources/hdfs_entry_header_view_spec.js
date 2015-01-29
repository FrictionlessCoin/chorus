describe("chorus.views.HdfsEntryHeader", function() {
    beforeEach(function() {
        this.dataSource = backboneFixtures.hdfsDataSource();
        this.hdfsEntry = backboneFixtures.hdfsDir();

        this.view = new chorus.views.HdfsEntryHeader({dataSource: this.dataSource, hdfsEntry: this.hdfsEntry});
    });

    it("shows the name and path as the title", function() {
        this.hdfsEntry.set({
            path: '/foo',
            name: 'bar'
        });
        this.view.render();

        expect(this.view.$('.title-text')).toContainText(this.dataSource.name() + ": /foo/bar");
        expect(this.view.$('.tag_box')).not.toExist();
    });

    it("ellipsizes long titles", function() {
        this.hdfsEntry.set({
            path: '/foo/m1/m2/m3/bar',
            name: 'baz'
        });
        this.view.render();

        expect(this.view.$('.title-text')).toContainText(this.dataSource.name() + ": /foo/…/baz");
    });

    it("does not show tags for folders in the root", function() {
        this.hdfsEntry.set({
            path: '/',
            name: 'bar'
        });
        this.view.render();

        expect(this.view.$('.tag_box')).not.toExist();
    });

    context("before loading", function() {
        beforeEach(function() {
            this.hdfsEntry.set({
                path: null,
                name: null
            });
            this.view.render();
        });

        it("does not display a title", function() {
            expect(this.view.$('.title-text').text()).toEqual(this.dataSource.name() + ': ');
        });
    });

    context("in the root folder", function() {
        beforeEach(function() {
            this.hdfsEntry.set({
                path: '/',
                name: '/'
            });
            this.view.render();
        });

        it("shows just '/' for the path in the title", function() {
            expect(this.view.$('.title-text')).toContainText(this.dataSource.name() + ": /");
        });

        it("shows tag bar below title", function() {
            expect(this.view.$('.tag_box')).toExist();
        });
    });
});