describe("chorus.views.TagBox", function() {
    beforeEach(function() {
        this.model = backboneFixtures.workfile.sql({
            tags: []
        });
        this.model.loaded = false;
        delete this.model.statusCode;
        this.model.fetch();
        this.view = new chorus.views.TagBox({model: this.model});
        spyOn(this.model, "updateTags");
    });

    describe("when the model has loaded", function() {
        beforeEach(function() {
            this.model.set("tags", [{name: 'alpha'},
                {name: 'beta'},
                {name: 'gamma'}
            ]);
            this.server.completeFetchFor(this.model);
        });

        it('shows the add tags textarea with ghost text', function() {
            expect(this.view.$('input.tag_editor')).toExist();
            expect(this.view.$('input').attr("placeholder")).toContainTranslation('tags.input.placeholder');
        });

        it('shows the tag names', function() {
            expect(this.view.$el).toContainText("alpha");
            expect(this.view.$el).toContainText("beta");
            expect(this.view.$el).toContainText("gamma");
        });

        it('shows the x character on the tags', function() {
            expect(this.view.$(".text-remove").eq(0)).toExist();
        });

        describe("when a valid tag is entered", function() {
            var tagName = _.repeat("a", 100);

            beforeEach(function() {
                enterTag(this.view, tagName);
            });

            it("creates a new tag", function() {
                expect(this.view.$(".text-tag").length).toBe(4);
            });

            it("removes the text from the input", function() {
                expect(this.view.$('input.tag_editor').val()).toBe("");
            });

            it("adds the tag to the model's tagset", function() {
                expect(this.view.tags.at(3).name()).toEqual(_.repeat("a", 100));
            });

            it('saves the tags', function() {
                expect(this.model.updateTags).toHaveBeenCalled();
                expect(this.model.updateTags.lastCall().args[0].add.name()).toBe(tagName);
            });
        });
            
        describe("when a tag is removed", function() {
            it('saves the tags', function() {
                this.view.$('.text-remove:first').click();
                expect(this.model.updateTags).toHaveBeenCalled();
                expect(this.model.updateTags.lastCall().args[0].remove.name()).toBe('alpha');
            });
        });

        describe("when a tag is clicked", function() {
            beforeEach(function() {
                $('#jasmine_content').append(this.view.el);
            });

            it('opens the tag show page', function() {
                spyOn(chorus.router, "navigate");
                this.view.$('.text-label').eq(1).click();
                expect(chorus.router.navigate).toHaveBeenCalledWith('#//tags/beta');
            });

            describe("when a workspace is specified", function() {
                beforeEach(function() {
                    this.view = new chorus.views.TagBox({model: this.model, workspaceIdForTagLink: 123});
                    this.view.render();
                    $('#jasmine_content').append(this.view.el);
                });

                it('opens the tag show page', function() {
                    spyOn(chorus.router, "navigate");
                    this.view.$('.text-label').eq(1).click();
                    expect(chorus.router.navigate).toHaveBeenCalledWith('#//workspaces/123/tags/beta');
                });
            });

            describe("when the tag name has special characters", function() {
                beforeEach(function() {
                    this.view.tags.add({name: '!@#$%^&*()"'});
                    this.view.render();
                });

                it('uri encodes the url', function() {
                    spyOn(chorus.router, "navigate");
                    this.view.$('.text-label').eq(3).click();
                    expect(chorus.router.navigate).toHaveBeenCalledWith('#//tags/!@%23$%25%5E&*()%22');
                });
            });
        });
    });
});
