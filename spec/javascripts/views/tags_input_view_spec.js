describe("chorus.views.TagsInput", function() {
    var view, tags, input;

    beforeEach(function() {
        this.clock = this.useFakeTimers();

        tags = new chorus.collections.TaggingSet([
            {name: 'alpha'},
            {name: 'beta'},
            {name: 'gamma'}
        ]);

        this.taggable = new chorus.models.Base();
        spyOn(chorus.views.TagsInput.prototype, 'render').andCallThrough();

        view = new chorus.views.TagsInput({tags: tags, taggable: this.taggable});

        this.addedSpy = jasmine.createSpy("addedTag");
        this.removedSpy = jasmine.createSpy("removedTag");
        tags.on("add", this.addedSpy);
        tags.on("remove", this.removedSpy);

        view.render();
        input = view.$("input");
    });

    context("with no tags", function() {
        beforeEach(function() {
            view.tags.reset();
            view.render();
        });

        it("shows placeholder text", function() {
            expect(view.$("input").attr("placeholder")).toContainTranslation("tags.input.placeholder");
        });
    });

    it('shows the tag names', function() {
        expect(view.$el).toContainText("alpha");
        expect(view.$el).toContainText("beta");
        expect(view.$el).toContainText("gamma");
    });

    it("re renders when the taggable trigger change:tags", function() {
        view.render.reset();
        this.taggable.trigger('change:tags');
        expect(view.render).toHaveBeenCalled();
    });

    describe('clicking on the x', function() {
        it('shows the x character on the tags', function() {
            expect(view.$(".text-remove").eq(0)).toExist();
        });
    });

    describe('clicking on the tag', function() {
        beforeEach(function() {
            $('#jasmine_content').append(view.el);
        });

        it("trigger the click event with a tag", function() {
            var foundTag;
            view.on("tag:click", function(tag) {
                foundTag = tag;
            });
            view.$('.text-label').eq(1).click();
            expect(foundTag.attributes).toEqual(tags.at(1).attributes);
        });
    });

    describe("when a valid tag is entered", function() {
        var tagName;
        beforeEach(function() {
            spyOn(view, "focusInput");
        });

        context("when the tag doesn't contain a ,", function() {
            beforeEach(function() {
                tagName = _.repeat("a", 100);
                enterTag(view, tagName);
            });

            it("creates a new tag", function() {
                expect(view.$(".text-tag").length).toBe(4);
            });

            it("removes the text from the input", function() {
                expect(view.$('input').val()).toBe("");
            });

            it("adds the tag to the tagset", function() {
                expect(this.addedSpy).toHaveBeenCalled();
            });

            it("sets the focus on the tag input", function() {
                expect(view.focusInput).toHaveBeenCalled();
            });
        });

        context("when the tag contains a ,", function() {
            var tagTeam = "some,tag";
            beforeEach(function() {
                enterTag(view, tagTeam);
            });

            it("creates two tags", function() {
                expect(view.$(".text-tag").length).toBe(5);
            });

            it("removes the text from the input", function() {
                expect(view.$('input').val()).toBe("");
            });

            it("adds the tag to the tagset", function() {
                expect(this.addedSpy.calls.count()).toBe(2);
            });

            it("sets the focus on the tag input", function() {
                expect(view.focusInput).toHaveBeenCalled();
            });
        });
    });

    describe("when an empty tag is entered", function() {
        beforeEach(function() {
            enterTag(view, "");
        });

        it("should not create a new tag", function() {
            expect(view.$(".text-tag").length).toBe(3);
            expect(this.addedSpy).not.toHaveBeenCalled();
        });
    });

    describe("when a tag with only white spaces is entered", function() {
        beforeEach(function() {
            enterTag(view, "       ");
        });

        it("should not create a new tag", function() {
            expect(view.$(".text-tag").length).toBe(3);
            expect(this.addedSpy).not.toHaveBeenCalled();
        });
    });

    describe("when an invalid tag is entered", function() {
        context("when the tag is too long", function() {
            var longString = _.repeat("a", 101);
            beforeEach(function() {
                enterTag(view, longString);
            });

            it("does not create a new tag", function() {
                expect(view.$(".text-tag").length).toBe(3);
                expect(this.addedSpy).not.toHaveBeenCalled();
            });

            it("does not remove the text from the input", function() {
                expect(input.val()).toBe(longString);
            });

            it("shows an error message", function() {
                expect(input).toHaveClass("has_error");
            });

            it("entering a valid tag clears the error class", function() {
                enterTag(view, "new-tag");
                expect(input).not.toHaveClass("has_error");
            });
        });
    });

    xdescribe("when the tag has a leading space", function() {
        beforeEach(function() {
            enterTag(view, " sigma");
        });

        it("discards the leading space", function() {
            expect(view.$(".text-tag .text-label")[3].innerHTML).toEqual("sigma");
            expect(this.addedSpy).toHaveBeenCalled();
        });

        it("does not allow adding the same tag with no space", function() {
            enterTag(view, "sigma");
            expect(this.addedSpy).toHaveBeenCalled();
            expect(this.addedSpy.calls.count()).toBe(1);
        });
    });

    describe("when a duplicate tag is entered", function() {
        beforeEach(function() {
            enterTag(view, "alpha");
        });

        it("adds the tag to the end of the list", function() {
            expect(view.$(".text-tag").length).toBe(3);
            expect(view.$(".text-tag:last")).toContainText('alpha');
        });
    });

    describe("escaping the tags", function() {
        beforeEach(function() {
            this.server.reset();
            view.tags.reset();
            view.render();
            view.$('a.edit_tags').click();
            var input = view.$('input.tag_editor');
            input.val("s");
            var event = $.Event('keyup');
            event.keyCode = 115; // s
            input.trigger(event);
            this.clock.tick(1000);
        });

        it("should escape malicious tags", function() {
            this.server.lastFetch().succeed([
                {name: '<script>foo</script>'}
            ]);
            expect($(view.el).html()).toContain("&lt;script&gt;foo&lt;/script&gt;");
            expect($(view.el).html()).not.toContain('<script>foo</script>');
        });
    });

    describe("displaying the list of suggested tags (autocomplete)", function() {
        beforeEach(function() {
            var input = view.$('input.tag_editor');
            input.val("s");
            var event = $.Event('keyup');
            event.keyCode = 115; // s
            input.trigger(event);
            this.clock.tick(1000);
        });

        it("escapes malicious tags", function() {
            this.server.lastFetch().succeed([
                {name: '<script>foo</script>'}
            ]);
            expect($(view.el).html()).toContain("&lt;script&gt;foo&lt;/script&gt;");
            expect($(view.el).html()).not.toContain('<script>foo</script>');
        });

        context("when the text entered is not an existing tag", function(){
            beforeEach(function() {
                this.server.lastFetch().succeed([{name: 'anotherTag'}]);
            });

            it("show '(Create new)' next to it in the suggestion list", function() {
                expect($(view.el).html()).toContainTranslation("tags.create_new");
            });

            context("when the user selects the suggestion", function(){
                beforeEach(function() {
                    view.$("div.text-suggestion").eq(0).click();
                });

                it("adds a tag with the text entered by the user (without '(Create new)')", function(){
                    expect(this.addedSpy.lastCall().args[0].get("name")).toEqual("s");
                });
            });
        });

        context("when the text entered is an existing tag", function(){
            beforeEach(function() {
                this.server.lastFetch().succeed([{name: 's'}]);
            });

            it("doesn't show '(Create new)' next to it in the suggestion list", function() {
                expect($(view.el).html()).toContain("s");
                expect($(view.el).html()).not.toContainTranslation("tags.create_new");
            });
        });
    });

    describe("on comma key up", function() {
        beforeEach(function() {
            this.input = view.$('input.tag_editor');
            this.enterKeyPressSpy = jasmine.createSpy("onEnterKeyPress");
            this.input.on("enterKeyPress", this.enterKeyPressSpy);

            this.input.val(',');

            this.getSuggestionsSpy = jasmine.createSpy("onGetSuggestions");
            this.input.on("getSuggestions", this.getSuggestionsSpy);

            var up = $.Event('commaKeyUp');
            up.keyCode = 188; // ,
            this.input.trigger(up);
        });

        it("behaves like enter key press", function() {
            expect(this.enterKeyPressSpy).toHaveBeenCalled();
        });

        it("clears the input field", function() {
            expect(this.input.val()).toEqual("");
        });

        it("triggers the getSuggestions event", function() {
            expect(this.getSuggestionsSpy).toHaveBeenCalled();
        });
    });

    describe("autocomplete", function() {
        var input;

        beforeEach(function() {
            var suggestions = backboneFixtures.tagSetJson({
                response: [{name: "alpha"}, {name: "beta"}, {name: "gamma"}]
            });
            $("#jasmine_content").append(view.el);
            view.tags.reset([{name: "alpha"}]);
            view.render();
            input = view.$("input.tag_editor");
            input.val("s");
            var event = $.Event('keyup');
            event.keyCode = 115; // s
            input.trigger(event);
            this.clock.tick(1000);
            expect(this.server.requests.length).toBeGreaterThan(0);
            this.server.lastFetch().succeed(suggestions.response, suggestions.pagination);
        });

        it("does not select anything by default", function() {
            expect(view.$(".text-list .text-selected")).not.toExist();
            expect(view.$(".text-dropdown").css("display")).not.toEqual('none');
        });

        describe("pressing down", function() {
            beforeEach(function() {
                var event = $.Event('keydown');
                event.keyCode = 40; // down arrow
                input.trigger(event);
            });

            it("selects the first suggested item", function() {
                expect(view.$(".text-suggestion:eq(0)")).toHaveClass('text-selected');
            });

            it("shows tag suggestions", function() {
                expect(view.$(".text-suggestion .text-label")).toContainText('beta');
                expect(view.$(".text-suggestion .text-label")).toContainText('gamma');
            });

            it("does not show existing tags", function() {
                expect(view.$(".text-suggestion .text-label")).not.toContainText('alpha');
            });

            describe("pressing up from the top row", function() {
                beforeEach(function() {
                    var event = $.Event('keydown');
                    event.keyCode = 38; // up arrow
                    input.trigger(event);
                });

                it("closes the menu", function() {
                    expect(view.$(".text-dropdown").css("display")).toEqual('none');
                });
            });
        });
    });
});
