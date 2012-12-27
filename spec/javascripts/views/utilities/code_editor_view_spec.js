describe("chorus.views.CodeEditorView", function() {
    beforeEach(function() {
        this.workfile = new chorus.models.Workfile();
        spyOn(this.workfile, "content").andReturn("");
        spyOn($.fn, "droppable").andCallThrough();

        this.view = new chorus.views.CodeEditorView({
            model: this.workfile,
            lineWrapping: false
        });
        $("#jasmine_content").append(this.view.el);
        this.clock = this.useFakeTimers();

        // in IE8, we can't 'select' a textrange whose textarea is not on the DOM
        if ($.browser.msie) {
            spyOn(window.TextRange.prototype, 'select');
        }
        spyOn(CodeMirror, "fromTextArea").andCallThrough();
    });

    it("defers call to CodeMirror", function() {
        this.view.render();
        expect(CodeMirror.fromTextArea).not.toHaveBeenCalled();
        this.clock.tick(1000);
        expect(CodeMirror.fromTextArea).toHaveBeenCalled();
    });

    describe("#render", function() {
        beforeEach(function() {
            stubDefer();
            this.view.render();
        });

        context("when deferred CodeMirror creation happens twice in one dom render", function() {
            beforeEach(function() {
                var deferredCodeMirror = _.defer.calls[0].args[0];
                deferredCodeMirror();
            });

            it("only calls CodeMirror once", function() {
                expect(CodeMirror.fromTextArea.callCount).toBe(1);
            });
        });

        it("displays line numbers", function() {
            expect(this.view.editor.getOption("lineNumbers")).toBe(true);
        });

        it("prepares the editor for drag/drop events", function() {
            expect($($.fn.droppable.calls[0].object)[0]).toBe(this.view.$(".CodeMirror")[0]);
        });

        context("and the user clicks insert on a function", function() {
            beforeEach(function() {
                spyOn(this.view.editor, 'replaceSelection');
                chorus.PageEvents.broadcast("file:insertText", "my awesome function");
            });

            it("inserts the function", function() {
                expect(this.view.editor.replaceSelection).toHaveBeenCalledWith("my awesome function");
            });
        });

        describe("drag and drop", function() {
            beforeEach(function() {
                this.drag = {draggable: $('<div data-fullname="test"></div>')};
                this.view.editor.replaceSelection("this is the first line\n\nthis is the third line");
                expect(this.view.editor.lineCount()).toBe(3);
            });

            it("inserts text at the beginning of a line", function() {
                var pos = this.view.editor.charCoords({line: 1, ch: 0});
                var fakeEvent = { pageX: pos.x, pageY: pos.y };
                this.view.acceptDrop(fakeEvent, this.drag);
                expect(this.view.editor.getLine(1)).toBe("test");
            });

            it("inserts text in the middle of a line", function() {
                var pos = this.view.editor.charCoords({line:2, ch: 12});
                this.view.acceptDrop({pageX: pos.x, pageY: pos.y}, this.drag);
                expect(this.view.editor.getLine(2)).toBe("this is the testthird line");
            });
        });
    });

    describe("delegation", function() {
        beforeEach(function() {
            stubDefer();
            this.view.render();
        });

        it("delegates a method to editor", function() {
            spyOn(this.view.editor, 'getValue').andReturn("Some value");
            expect(this.view.getValue()).toBe("Some value");
        });
    });
});
