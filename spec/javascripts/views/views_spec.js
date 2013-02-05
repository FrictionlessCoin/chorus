describe("chorus.views.Base", function() {
    describe("initialize", function() {
        describe("resourcesLoaded", function() {
            beforeEach(function() {
                this.model = new chorus.models.Base();
                spyOn(this.model, 'url').andReturn('/foo/bar');
                spyOn(chorus.views.Base.prototype, 'resourcesLoaded');
                spyOn(chorus.views.Base.prototype, 'render');
            });

            context("when the resources are already loaded", function() {
                beforeEach(function() {
                    spyOn(chorus.RequiredResources.prototype, 'allResponded').andReturn(true);
                    this.view = new chorus.views.Base({requiredResources: this.model});
                });

                it("calls resourcesLoaded during initialization", function() {
                    expect(this.view.resourcesLoaded).toHaveBeenCalled();
                });
            });

            context("when the resources are not loaded", function() {
                beforeEach(function() {
                    spyOn(chorus.RequiredResources.prototype, 'allResponded').andReturn(false);
                    this.view = new chorus.views.Base({requiredResources: this.model});
                });

                it("does not call resourcesLoaded during initialization", function() {
                    expect(this.view.resourcesLoaded).not.toHaveBeenCalled();
                });

                describe("once it has been loaded", function() {
                    beforeEach(function() {
                        this.view.requiredResources.trigger('allResourcesResponded');
                    });

                    it("calls resourcesLoaded after model has been loaded", function() {
                        expect(this.view.resourcesLoaded).toHaveBeenCalled();
                    });

                    it("calls render", function() {
                        expect(this.view.render).toHaveBeenCalled();
                    });
                });

            });
        });
    });

    describe("event bindings", function() {
        beforeEach(function() {
            this.model = new chorus.models.Base();
        });

        describe("with persistent falsy", function() {
            beforeEach(function() {
                this.view = new chorus.views.Base({model: this.model});
                spyOn(this.view, 'template').andReturn("");
                // render is bound on the view object before we can spy on it.
                spyOn(this.view, "preRender");
            });

            _.each(["reset", "change"], function(evt) {
                it("re-renders on the " + evt + " event", function() {
                    this.view.resource.trigger(evt);
                    expect(this.view.preRender).toHaveBeenCalled();
                });
            });
        });

        describe("with persistent:true", function() {
            beforeEach(function() {
                chorus.views.Base.prototype.persistent = true;
                this.view = new chorus.views.Base({model: this.model});
                spyOn(this.view, 'template').andReturn("");
                // render is bound on the view object before we can spy on it.
                spyOn(this.view, "preRender");
            });
            afterEach(function() {
                delete chorus.views.Base.prototype.persistent;
            });

            _.each(["reset", "add", "remove", "change"], function(evt) {
                it("re-renders on the " + evt + " event", function() {
                    this.view.resource.trigger(evt);
                    expect(this.view.preRender).not.toHaveBeenCalled();
                });
            });
        });
    });

    describe("unbindCallbacks", function() {
        beforeEach(function() {
            spyOn(chorus.views.Base.prototype, 'showErrors');
            spyOn(chorus.views.Base.prototype, 'clearErrors');
            spyOn(chorus.views.Base.prototype, 'render');
            this.model = new chorus.models.Base();
            this.view = new chorus.views.Base({model: this.model});
            this.view.unbindCallbacks();
        });

        it("unbinds the default callbacks", function() {
            this.model.trigger("saveFailed");
            this.model.trigger("validationFailed");
            this.model.trigger("saveFailed");
            this.model.trigger("validated");
            this.model.trigger("change");
            this.model.trigger("reset");
            expect(this.view.showErrors).not.toHaveBeenCalled();
            expect(this.view.clearErrors).not.toHaveBeenCalled();
            expect(this.view.render).not.toHaveBeenCalled();
        });
    });

    describe("setModel", function() {
        beforeEach(function() {
            this.oldModel = new chorus.models.Base();
            this.newModel = new chorus.models.Base();
            this.randomModel = new chorus.models.Base();
            this.view = new chorus.views.Base();
            spyOn(this.view, 'render');
            this.view.resource = this.view.model = this.oldModel;
            this.view.bindCallbacks();
            this.view.bindings.add(this.randomModel, "change", this.view.render);
            this.view.setModel(this.newModel);
        });

        it("unbinds the default model events from the old model", function() {
            this.oldModel.trigger("change");
            expect(this.view.render).not.toHaveBeenCalled();
        });

        it("binds the default model events to the new model", function() {
            this.newModel.trigger("change");
            expect(this.view.render).toHaveBeenCalled();
        });

        it("does not affect other model bindings ", function() {
            this.randomModel.trigger("change");
            expect(this.view.render).toHaveBeenCalled();
        });
    });

    describe(".extended", function() {
        it("sets the view's className based on its templateName", function() {
            var Klass = chorus.views.Bare.extend({ templateName: "users/something/else" });
            expect(Klass.prototype.className).toBe("users_something_else");
        });
    });

    describe("hotkey bindings", function() {
        stubKeyboardMetaKey();
        beforeEach(function() {
            chorus._navigated();

            chorus.views.HotKeyTest = chorus.views.Base.extend({
                hotkeys: {
                    'r': 'my:event'
                }
            });

            spyOn($.fn, "bind").andCallThrough();
            this.view = new chorus.views.HotKeyTest();
        });

        it("binds hotkeys", function() {
            expect($(document).data("events").keydown).toBeDefined();
        });

        it("broadcasts events on hotkeys", function() {
            spyOn(chorus.PageEvents, "broadcast");
            var ev = $.Event("keydown", { which: 82, ctrlKey: true });
            $(document).trigger(ev);
            expect(chorus.PageEvents.broadcast).toHaveBeenCalledWith("my:event", ev);
        });

        describe("navigating away", function() {
            beforeEach(function() {
                this.oldKeydownCount = $(document).data("events").keydown.length;
                chorus._navigated();
            });

            it("should unbind from document", function() {
                expect(($(document).data("events").keydown || []).length).toBe(this.oldKeydownCount - 1);
            });
        });
    });
    describe("#context", function() {

        describe("for a view with a model", function() {
            beforeEach(function() {
                this.model = new chorus.models.Base({ bar: "foo"});
                this.view = new chorus.views.Base({ model: this.model });
            });

            it("serializes the attributes of the model", function() {
                expect(this.view.context()).toEqual({ bar: "foo", resource: this.model, view: this.view });
            });

            describe("loaded:true", function() {
                beforeEach(function() {
                    this.model.loaded = true;
                });

                it("returns loaded:true", function() {
                    expect(this.view.context().loaded).toBeTruthy();
                });
            });

            describe("loaded:false", function() {
                beforeEach(function() {
                    this.model.loaded = false;
                });

                it("returns loaded:false", function() {
                    expect(this.view.context().loaded).toBeFalsy();
                });
            });

            describe("when an additionalContext is defined", function() {
                beforeEach(function() {
                    this.view.additionalContext = function() {
                        return {one: 1};
                    };
                    spyOn(this.view, 'additionalContext').andCallThrough();
                });

                it("still contains the attributes of the model", function() {
                    expect(this.view.context().bar).toBe("foo");
                });

                it("includes the additionalContext in the context", function() {
                    expect(this.view.context().one).toBe(1);
                });

                it("calls #additionalContext, passing the default context (including the server errors)", function() {
                    this.model.serverErrors = {fields: {a: {BLANK: {}}}};
                    this.view.context();
                    var contextPassed = this.view.additionalContext.mostRecentCall.args[0];
                    expect(contextPassed.serverErrors).toBe(this.model.serverErrors);
                });
            });

            describe("#preRender", function() {
                beforeEach(function() {
                    var self = this;
                    this.postRenderCallCountWhenPreRenderCalled = 0;
                    this.view.template = function() {
                        return "<form><input name='foo'/><input name='bar'/><input name='whiz'/></form>";
                    };

                    spyOn(this.view, "postRender").andCallThrough();
                    spyOn(this.view, "preRender").andCallFake(function() {
                        self.postRenderCallCountWhenPreRenderCalled = self.view.postRender.callCount;
                    });

                    this.view.render();
                });

                it("is called before postRender", function() {
                    expect(this.postRenderCallCountWhenPreRenderCalled).toBe(0);
                    expect(this.view.postRender.callCount).toBe(1);
                });
            });

            describe("#render", function() {
                beforeEach(function() {
                    var SubClass = chorus.views.Base.extend({
                        templateName: "one/two/three",
                        template: function() { return "<div class='foo'/>"; }
                    });
                    this.view = new SubClass();
                    spyOn(chorus.PageEvents, "broadcast");
                    this.view.render();
                });

                it("triggers a 'content:changed' event on itself", function() {
                    expect(chorus.PageEvents.broadcast).toHaveBeenCalledWith("content:changed");
                });

                it("adds the template name as a data-template", function() {
                    expect($(this.view.el)).toHaveAttr("data-template", "one/two/three");
                });

                describe("with subviews", function() {
                    beforeEach(function() {
                        this.subview = new chorus.views.Base();
                        this.subview.templateName = "plain_text";
                        this.view.foo = this.subview;

                        this.view.subviews = {".foo": "foo"};
                        spyOn(this.subview, "render");
                    });

                    context("when the subview does not have required resources", function() {
                        beforeEach(function() {
                            this.view.render();
                        });

                        it("renders the subview", function() {
                            expect(this.subview.render).toHaveBeenCalled();
                        });
                    });

                    context("when the subview has required resources", function() {
                        beforeEach(function() {
                            this.subviewModel = new chorus.models.User();
                            this.subview.requiredResources.add(this.subviewModel);
                        });

                        context("and the required resources are not loaded", function() {
                            beforeEach(function() {
                                this.view.render();
                            });

                            it("does not render the subview", function() {
                                expect(this.subview.render).not.toHaveBeenCalled();
                            });
                        });

                        context("and the required resources are loaded", function() {
                            beforeEach(function() {
                                this.subviewModel.statusCode = 422;
                                this.view.render();
                            });

                            it("renders the subview", function() {
                                expect(this.subview.render).toHaveBeenCalled();
                            });
                        });
                    });

                    describe("renderSubview", function() {
                        beforeEach(function() {
                            this.view.render();
                            this.subview.render.reset();
                            this.subview.render.andCallThrough();
                        });

                        it("renders when given both object name and selector", function() {
                            this.view.renderSubview('foo', '.foo');
                            expect(this.subview.render).toHaveBeenCalled();
                        });

                        it("renders when given just the object name", function() {
                            this.view.renderSubview('foo');
                            expect(this.subview.render).toHaveBeenCalled();
                        });

                        it("doesn't remove the element from the dom when re-rendering the same subview", function() {
                            expect(this.view.$(".foo")[0]).toBe(this.subview.el);

                            this.view.renderSubview("foo");
                            expect(this.view.$(".foo")[0]).toBe(this.subview.el);
                        });

                        it("registers each subview", function() {
                           expect(_.indexOf(this.view.getSubViews(), this.view.foo)).toBeGreaterThan(-1);
                        });

                        describe("after a new subview has been assigned", function() {
                            beforeEach(function() {
                                this.otherSubview =new chorus.views.Base();
                                this.otherSubview.templateName = "plain_text";
                                this.otherSubview.additionalClass = "other_subview";

                                this.view.foo = this.otherSubview;
                            });

                            it("can successfully call renderSubview when the subview object has been reassigned", function() {
                                expect(this.view.$(".foo")[0]).toBe(this.subview.el);

                                this.view.renderSubview("foo");

                                expect(this.view.$(".foo")[0]).toBe(this.otherSubview.el);
                            });
                        });
                    });
                });
            });
        });

        describe("when an additionalContext is defined", function() {
            beforeEach(function() {
                this.view = new chorus.views.Base();
                spyOn(this.view, "additionalContext").andCallFake(function() {
                    return {one: 1};
                });
            });

            it("includes the additionalContext in the context", function() {
                expect(this.view.context().one).toBe(1);
            });
        });

        describe("for a view with a collection", function() {
            beforeEach(function() {
                this.collection = new chorus.collections.Base([
                    new chorus.models.Base({ bar: "foo"}),
                    new chorus.models.Base({ bro: "baz"})
                ], { custom: "stuff" });
                this.view = new chorus.views.Base({ collection: this.collection });
            });

            it("serializes the attributes of the collection", function() {
                expect(this.view.context().custom).toBe("stuff");
            });

            it("serializes the attributes of the collection objects into the 'models' key", function() {
                var modelContext = this.view.context().models;
                expect(modelContext).not.toBeUndefined();
                expect(modelContext.length).toBe(2);
                expect(modelContext[0]).toEqual({ bar: "foo", model: this.collection.models[0] });
                expect(modelContext[1]).toEqual({ bro: "baz", model: this.collection.models[1] });
            });

            context("when a collectionModelContext is defined", function() {
                beforeEach(function() {
                    this.view.collectionModelContext = function(model) {
                        return {my_cid: model.cid};
                    };
                });

                it("includes the collectionModelContext in the context for each model", function() {
                    var context = this.view.context();
                    expect(context.models[0].my_cid).toBe(this.collection.models[0].cid);
                    expect(context.models[1].my_cid).toBe(this.collection.models[1].cid);
                });
            });

            describe("when an additionalContext is defined", function() {
                beforeEach(function() {
                    spyOn(this.view, "additionalContext").andCallFake(function() {
                        return {one: 1};
                    });
                });

                it("includes the additionalContext in the context", function() {
                    expect(this.view.context().one).toBe(1);
                });
            });

            describe("loaded:true", function() {
                beforeEach(function() {
                    this.collection.loaded = true;
                });

                it("returns loaded:true", function() {
                    expect(this.view.context().loaded).toBeTruthy();
                });
            });

            describe("loaded:false", function() {
                beforeEach(function() {
                    this.collection.loaded = false;
                });

                it("returns loaded:false", function() {
                    expect(this.view.context().loaded).toBeFalsy();
                });
            });
        });

        describe("when passed a resource", function() {
            beforeEach(function() {
                this.model = new chorus.models.Base({ bar: "foo"});
                this.actualResource = new chorus.models.Base({ bar: "bar"});
                this.view = new chorus.views.Base({ model: this.model });
            });

            it("uses the provided resource", function() {
                var context = this.view.context(this.actualResource);
                expect(context.bar).toBe('bar');
            });
        });
    });

    describe("validation", function() {
        beforeEach(function() {
            this.model = new chorus.models.Base();
            spyOn(chorus.views.Base.prototype, 'showErrors').andCallThrough();
            spyOn(chorus.views.Base.prototype, 'clearErrors').andCallThrough();
            this.view = new chorus.views.Base({ model: this.model });
            this.view.template = function() {
                return "<form><input name='foo'/><input name='bar'/><input name='whiz'/></form>";
            };
            this.model.performValidation = function() {
                this.errors = {};
                this.require("foo");
            };
        });

        it("calls #showErrors when validation fails on the model", function() {
            this.model.trigger("validationFailed");
            expect(this.view.showErrors).toHaveBeenCalled();
        });

        it("calls #clearErrors when validation succeeds on the model", function() {
            this.model.trigger("validated");
            expect(this.view.clearErrors).toHaveBeenCalled();
        });
    });

    describe("before navigating away", function() {
        beforeEach(function() {
            this.view = new chorus.views.Base();
            spyOn(this.view, "teardown").andCallThrough();

            chorus._navigated();
        });

        it("calls the 'teardown' hook", function() {
            expect(this.view.teardown).toHaveBeenCalled();
        });

        describe("when another navigation occurs (after this view is long gone)", function() {
            beforeEach(function() {
                chorus._navigated();
            });

            it("does not call the hook again", function() {
                expect(this.view.teardown.callCount).toBe(1);
            });
        });

        describe("the default implementation", function() {
            beforeEach(function() {
                this.view = new chorus.views.Base();
                spyOn($.fn, "remove");
                spyOn(this.view.requiredResources, 'cleanUp');
                spyOn(this.view.bindings, 'removeAll');
                spyOn(this.view, 'unbind');
                this.view.teardown();
            });

            it("calls $.fn.remove on its element", function() {
                expect($.fn.remove.mostRecentCall.object.get(0)).toEqual(this.view.el);
            });

            it("removes its backbone event bindings", function() {
                expect(this.view.unbind).toHaveBeenCalled();
                expect(this.view.requiredResources.cleanUp).toHaveBeenCalledWith(this.view);
                expect(this.view.bindings.removeAll).toHaveBeenCalled();
            });
        });
    });

    describe("#showErrors", function() {
        beforeEach(function() {
            this.view = new chorus.views.Base({ model: this.model });
            this.view.template = function() {
                return "<form><input name='foo'/><input name='bar'/><input name='whiz'/></form>";
            };
            this.view.model = new chorus.models.Base();
            this.view.model.errors = { foo: "you need a foo" };
            this.view.resource = this.view.model;

            spyOn(this.view, "render").andCallThrough();
            this.view.render();
        });

        context("with no parameters", function() {
            beforeEach(function() {
                this.view.showErrors();
            });

            it("sets the has_error class on fields with errors", function() {
                expect(this.view.$("input[name=foo]")).toHaveClass("has_error");
                expect(this.view.$("input[name=foo]").hasQtip()).toBeTruthy();
            });

            it("clears the has_error class on all fields without errors", function() {
                expect(this.view.$("input[name=bar]")).not.toHaveClass("has_error");
                expect(this.view.$("input[name=whiz]")).not.toHaveClass("has_error");
                expect(this.view.$("input[name=bar]").hasQtip()).toBeFalsy();
                expect(this.view.$("input[name=whiz]").hasQtip()).toBeFalsy();
            });

            it("does not re-render", function() {
                expect(this.view.render.callCount).toBe(1);
            });

            it("adds tooltips to the has_error fields", function() {
                expect(this.view.$(".has_error").hasQtip()).toBeTruthy();
            });

            it("does not add tooltips to the other input fields", function() {
                expect(this.view.$("input[name=bar]").hasQtip()).toBeFalsy();
            });

            it("clears error html that is not applicable", function() {
                this.view.model.errors = {};
                this.view.showErrors();
                expect(this.view.$("input[id=foo]").hasQtip()).toBeFalsy();
                expect($(".qtip").length).toBe(0);
            });
        });

        context("given a different model as a parameter", function() {
            beforeEach(function() {
                this.otherModel = new chorus.models.Base();
                this.otherModel.errors = { 'bar': "you need a bar" };
                this.view.showErrors(this.otherModel);
            });

            it("uses the other model's errors, instead of the view's own model", function() {
                expect(this.view.$("input[name=foo]")).not.toHaveClass("has_error");
                expect(this.view.$("input[name=foo]").hasQtip()).toBeFalsy();
                expect(this.view.$("input[name=bar]")).toHaveClass("has_error");
                expect(this.view.$("input[name=bar]").hasQtip()).toBeTruthy();
            });
        });

        describe("calling #clearErrors afterwards", function() {
            beforeEach(function() {
                this.view.clearErrors();
            });

            it("clears client-side errors", function() {
                expect(this.view.$(".has_error").length).toBe(0);
                expect(this.view.$("input[name=bar]").hasQtip()).toBeFalsy();
                expect(this.view.$("input[name=foo]").hasQtip()).toBeFalsy();
                expect(this.view.$("input[name=whiz]").hasQtip()).toBeFalsy();
            });
        });
    });

    describe("MainContentView", function() {
        describe("#render", function() {
            beforeEach(function() {
                this.view = new chorus.views.MainContentView();

                this.view.contentHeader = stubView("header text");
                this.view.content = stubView("content text");

                this.view.render();
            });

            context("with a supplied contentHeader", function() {
                it("should render the header", function() {
                    expect(this.view.$(".content_header").text()).toBe("header text");
                });
            });

            context("with a supplied content", function() {
                it("should render the content", function() {
                    expect(this.view.$(".content").text()).toBe("content text");
                });
            });

            context("without a supplied content", function() {
                beforeEach(function() {
                    this.view.content = undefined;
                    this.view.render();
                });

                it("should have the hidden class on the content div", function() {
                    expect((this.view.$(".content"))).toHaveClass("hidden");
                });
            });

            context("without a supplied contentDetails", function() {
                it("should have the hidden class on the content_details div", function() {
                    expect((this.view.$(".content_details"))).toHaveClass("hidden");
                });
            });

            context("with a supplied contentDetails", function() {
                beforeEach(function() {
                    this.view.contentDetails = stubView("content details text");
                    this.view.render();
                });

                it("should render the contentDetails", function() {
                    expect((this.view.$(".content_details").text())).toBe("content details text");
                });
            });

            context("without a supplied contentFooter", function() {
                it("should have the hidden class on the content_footer div", function() {
                    expect((this.view.$(".content_footer"))).toHaveClass("hidden");
                });
            });

            context("with a supplied contentFooter", function() {
                beforeEach(function() {
                    this.view.contentFooter = stubView("content footer text");
                    this.view.render();
                });

                it("should render the contentFooter", function() {
                    expect((this.view.$(".content_footer").text())).toBe("content footer text");
                });
            });
        });
    });

    describe("MainContentList", function() {
        beforeEach(function() {
            this.collection = rspecFixtures.userSet();
        });

        describe("#setup", function() {
            context("when no title override is provided", function() {
                beforeEach(function() {
                    this.view = new chorus.views.MainContentList({ collection: this.collection, modelClass: "User" });
                });

                it("sets the title of the content header to the plural of the model class", function() {
                    expect(this.view.contentHeader.options.title).toBe("Users");
                });

                context("emptyTitleBeforeFetch option set", function() {
                    beforeEach(function() {
                        this.view = new chorus.views.MainContentList({ collection: this.collection, modelClass: "User", emptyTitleBeforeFetch: true });
                    });

                    it("should not display the title", function() {
                        expect(this.view.contentHeader.options.title).toBe(false);
                    });
                });
            });

            context("when a title override is provided", function() {
                beforeEach(function() {
                    this.view = new chorus.views.MainContentList({ collection: this.collection, modelClass: "User", title: "YES!" });
                });

                it("sets the title of the content header to the override", function() {
                    expect(this.view.contentHeader.options.title).toBe("YES!");
                });
            });

            context("when a contentDetailsOptions hash is provided", function() {
                beforeEach(function() {
                    this.view = new chorus.views.MainContentList({ collection: this.collection, modelClass: "User", contentDetailsOptions: {foo: "bar"} });
                });

                it("gets mixed in to the options for the list content details", function() {
                    expect(this.view.contentDetails.options.foo).toBe("bar");
                });
            });

            context("when a contentOptions hash is provided", function() {
                beforeEach(function() {
                    this.view = new chorus.views.MainContentList({ collection: this.collection, modelClass: "User", contentOptions: {foo: "bar"} });
                });

                it("gets mixed in to the content's options", function() {
                    expect(this.view.content.options).toEqual({foo: "bar", collection: this.collection});
                });
            });

            context("when no contentDetails is provided", function() {
                beforeEach(function() {
                    this.view = new chorus.views.MainContentList({ collection: this.collection, modelClass: "User" });
                });

                it("creates a ListContentDetails view", function() {
                    expect(this.view.contentDetails).toBeA(chorus.views.ListContentDetails);
                });
            });

            context("when a custom contentDetails is provided", function() {
                beforeEach(function() {
                    this.contentDetails = stubView();
                    this.view = new chorus.views.MainContentList({ collection: this.collection, modelClass: "User", contentDetails: this.contentDetails });
                });

                it("does not create a ListContentDetails view", function() {
                    expect(this.view.contentDetails).not.toBeA(chorus.views.ListContentDetails);
                });

                it("uses the custom contentDetails", function() {
                    expect(this.view.contentDetails).toBe(this.contentDetails);
                });

                it("does not construct a contentFooter", function() {
                    expect(this.view.contentFooter).toBeUndefined();
                });
            });

            context("when persistent is passed as an option", function() {
                beforeEach(function() {
                    this.view = new chorus.views.MainContentList({ persistent: true, collection: this.collection, modelClass: "User" });
                });

                it("sets persistent as a property of the view", function() {
                    expect(this.view.persistent).toBeTruthy();
                });
            });

            context("when contentHeader is provided", function() {
                beforeEach(function() {
                    this.contentHeader = stubView();
                    this.view = new chorus.views.MainContentList({ contentHeader: this.contentHeader, collection: this.collection, modelClass: "User" });
                });

                it("uses the provided view", function() {
                    expect(this.view.contentHeader).toBe(this.contentHeader);
                });
            });

            context("search option", function() {
                beforeEach(function() {
                    this.searchOptions = {foo: "bar"};
                    this.view = new chorus.views.MainContentList({
                        collection: rspecFixtures.userSet(),
                        modelClass: "User",
                        search: this.searchOptions
                    });
                    this.view.render();
                });

                it("passes the search option to the list content details", function() {
                    expect(this.view.contentDetails.options.search).toEqual({foo: "bar", list: $(this.view.content.el)});
                });
            });

            context("when checkable is true", function() {
                beforeEach(function() {
                    this.collection = rspecFixtures.workfileSet();
                    this.view = new chorus.views.MainContentList({
                        collection: this.collection,
                        modelClass: "Workfile",
                        checkable: true
                    });
                });

                it("sets up a CheckableList as the content", function() {
                    expect(this.view.content).toBeA(chorus.views.CheckableList);
                });

                it("actually renders the checkboxes", function() {
                    this.view.render();
                    expect(this.view.$("li input[type=checkbox]").length).toBe(this.collection.length);
                });
            });
        });
    });

    describe("ListHeaderView", function() {
        beforeEach(function() {
            this.view = new chorus.views.ListHeaderView({
                title: "Hi there",
                linkMenus: {
                    my_menu: {
                        title: "Title",
                        options: [
                            {data: "", text: "All"},
                            {data: "sql", text: "SQL"}
                        ],
                        event: "filter"
                    }
                }
            });
        });

        describe("#render", function() {
            beforeEach(function() {
                this.view.render();
            });

            it("renders link menus", function() {
                expect(this.view.$(".menus ul[data-event=filter]")).toExist();
            });

            it("renders the header title", function() {
                expect(this.view.$("h1").text().trim()).toBe("Hi there");
                expect(this.view.$("h1").attr("title")).toBe("Hi there");
            });

            it("does not render an image", function() {
                expect(this.view.$(".icon")).not.toExist();
            });

            it("adds a class based on the key in the linkMenu's hash", function() {
                expect(this.view.$('.menus > .my_menu')).toExist();
            });

            it("doesn't render the sandbox location", function () {
                expect(this.view.$(".found_in")).not.toExist();
            });

            context("when an imageUrl is provided", function() {
                beforeEach(function() {
                    this.view.options.imageUrl = "image/foo/bar.png";
                    this.view.render();
                });

                it("renders the image", function() {
                    expect(this.view.$(".icon")).toHaveAttr("src", "image/foo/bar.png");
                });

                context("and an imageTitle is provided", function() {
                    beforeEach(function() {
                        this.view.options.imageTitle = "a title";
                        this.view.render();
                    });

                    it("sets the title on the image", function() {
                        expect(this.view.$(".icon")).toHaveAttr("title", "a title");
                    });
                });
            });

            context("when sandbox is provided", function () {
                beforeEach(function () {
                    this.workspace = rspecFixtures.workspace();
                    this.view.options.sandbox = this.workspace.sandbox();
                    this.view.render();
                });
                it("shows the location of the sandbox", function () {
                    expect(this.view.$(".found_in").text()).not.toBeEmpty();
                    expect(this.view.$(".found_in a").eq(0).text()).toBe(this.workspace.sandbox().instance().name());
                    expect(this.view.$(".found_in a").eq(1).text()).toBe(this.workspace.sandbox().database().name());
                    expect(this.view.$(".found_in a").eq(2).text()).toBe(this.workspace.sandbox().schema().name());
                });
            });

            context("when sandbox is provided", function () {
                beforeEach(function () {
                    this.workspace = rspecFixtures.workspace();
                    this.view.options.sandbox = this.workspace.sandbox();
                    this.view.render();
                });
                it("shows the location of the sandbox", function () {
                    expect(this.view.$(".found_in").text()).not.toBeEmpty();
                    expect(this.view.$(".found_in a").eq(0).text()).toBe(this.workspace.sandbox().instance().name());
                    expect(this.view.$(".found_in a").eq(1).text()).toBe(this.workspace.sandbox().database().name());
                    expect(this.view.$(".found_in a").eq(2).text()).toBe(this.workspace.sandbox().schema().name());
                });
            });
        });

        describe("event propagation", function() {
            beforeEach(function() {
                this.view.render();
            });

            it("propagates choice events as choice: events", function() {
                this.choiceSpy = jasmine.createSpy("choice:filter");
                this.view.bind("choice:filter", this.choiceSpy);
                this.view.$("li[data-type=sql] a").click();
                expect(this.choiceSpy).toHaveBeenCalledWith("sql");
            });
        });
    });

    describe("loading section", function() {
        beforeEach(function() {
            this.view = new chorus.views.Bare();
            this.view.templateName = "plain_text";
            this.view.context = function() {
                return { text: "Foo" };
            };
        });

        describe("rendering the loading section", function() {
            context("when displayLoadingSection returns true", function() {
                beforeEach(function() {
                    this.view.context = jasmine.createSpy('context');
                    this.view.subviews = {".asdf": "fdsa"};
                    spyOn(this.view, 'getSubview').andCallThrough();
                    this.view.displayLoadingSection = function() {
                        return true;
                    };
                });

                it("does not call context", function() {
                    this.view.render();
                    expect(this.view.context).not.toHaveBeenCalled();
                });

                it("does not render regular subviews", function() {
                    this.view.render();
                    expect(this.view.getSubview).toHaveBeenCalledWith('makeLoadingSectionView');
                    expect(this.view.getSubview).not.toHaveBeenCalledWith("fdsa");
                });

                it("renders the loading template", function() {
                    this.view.render();
                    expect(this.view.$('.loading_section').length).toBe(1);
                });

                context("when makeLoadingSectionView is overridden", function() {
                    beforeEach(function() {
                        var otherView = this.otherView = new chorus.views.Base();
                        spyOn(this.otherView, 'render').andReturn({el: $("<div/>")});

                        this.view.makeLoadingSectionView = function() {
                            return otherView;
                        };
                    });

                    it("renders what is returned by makeLoadingSectionView", function() {
                        this.view.render();
                        expect(this.otherView.render).toHaveBeenCalled();
                    });
                });

                context("when loadingSectionOptions is overridden", function() {
                    beforeEach(function() {
                        this.view.loadingSectionOptions = function() {
                            return {delay: 9000};
                        };

                        var origSection = chorus.views.LoadingSection;
                        spyOn(chorus.views, "LoadingSection").andReturn(new origSection());
                    });

                    it("passes those options to the LoadingSection constructor", function() {
                        this.view.render();
                        expect(chorus.views.LoadingSection).toHaveBeenCalledWith({delay: 9000});
                    });
                });
            });

            context("when displayLoadingSection returns false", function() {
                beforeEach(function() {
                    this.view.displayLoadingSection = function() {
                        return false;
                    };
                });

                context("when required resources are loaded", function() {
                    beforeEach(function() {
                        this.view.render();
                    });

                    it("renders the 'normal' template", function() {
                        expect($(this.view.el)).toContainText("Foo");
                        expect(this.view.$('.loading_section').length).toBe(0);
                    });
                });

                context("when required resources are not loaded", function() {
                    beforeEach(function() {
                        spyOn(this.view.requiredResources, 'allResponded').andReturn(false);
                        $(this.view.el).text('Old');
                        this.view.render();
                    });

                    it("does not render", function() {
                        expect($(this.view.el).text()).toBe("Old");
                    });
                });
            });
        });
    });

    describe("chorus.views.Base", function() {
        describe("displayLoadingSection", function() {
            beforeEach(function() {
                this.model = new chorus.models.Base();
                this.view = new chorus.views.Base({model: this.model});
            });

            it("returns false by default", function() {
                expect(this.view.displayLoadingSection()).toBeFalsy();
            });

            context("when the view has useLoadingSection set to true", function() {
                beforeEach(function() {
                    this.view.useLoadingSection = true;
                });

                context("when there are requiredResources", function() {
                    beforeEach(function() {
                        this.resource = rspecFixtures.user();
                        this.view.requiredResources.push(this.resource);
                        spyOn(this.view.requiredResources, 'allResponded');
                    });

                    it("returns true if the resources are not yet loaded", function() {
                        this.view.requiredResources.allResponded.andReturn(false);
                        expect(this.view.displayLoadingSection()).toBeTruthy();
                    });

                    it("returns false if the resources are loaded", function() {
                        this.view.requiredResources.allResponded.andReturn(true);
                        expect(this.view.displayLoadingSection()).toBeFalsy();
                    });
                });

                context("when there are no requiredResources", function() {
                    it("returns the opposite of view.resource.loaded", function() {
                        this.model.loaded = false;
                        expect(this.view.displayLoadingSection()).toBeTruthy();

                        this.model.loaded = true;
                        expect(this.view.displayLoadingSection()).toBeFalsy();
                    });

                    it("returns false when the view does not have a resource", function() {
                        delete this.view.resource;
                        expect(this.view.displayLoadingSection()).toBeFalsy();
                    });
                });
            });
        });

        describe("placeholder", function() {
            beforeEach(function() {
                this.view = new chorus.views.Base();
                this.view.templateName = "plain_text";
                spyOn(chorus, 'placeholder');
                this.view.render();
            });

            it("sets up input placeholders for older browsers", function() {
                expect(chorus.placeholder).toHaveBeenCalledWith(this.view.$("input[placeholder], textarea[placeholder]"));
            });
        });
    });

    describe("chorus.views.Bare", function() {
        describe("#setupScrolling", function() {
            beforeEach(function() {
                this.page = new chorus.pages.Base();
                chorus.page = this.page;
                this.view = new chorus.views.Bare();
                this.view.template = function() {
                    return "<div class='foo'><div class='subfoo'/></div>";
                };
                this.view.subviews = { ".subfoo": "subfoo" };
                this.view.subfoo = new chorus.views.Bare();
                this.view.subfoo.templateName = "plain_text";
                this.view.render();
                stubDefer();

                spyOn($.fn, "jScrollPane").andCallThrough();
                spyOn($.fn, "hide").andCallThrough();
                spyOn($.fn, "bind").andCallThrough();
                spyOn(this.page, "bind").andCallThrough();
                spyOn(this.view, "recalculateScrolling").andCallThrough();
            });

            context("with a valid view", function() {
                beforeEach(function() {
                    this.view.setupScrolling(".foo");
                });

                it("defers the setup", function() {
                    expect(_.defer).toHaveBeenCalled();
                });

                it("calls jScrollPane", function() {
                    expect($.fn.jScrollPane).toHaveBeenCalledOnSelector(".foo");
                });

                it("adds the custom_scroll class to the element", function() {
                    expect($(this.view.$(".foo"))).toHaveClass("custom_scroll");
                });

                it("hides the scrollbars initially", function() {
                    expect($.fn.hide).toHaveBeenCalledOnSelector(".foo .jspVerticalBar");
                    expect($.fn.hide).toHaveBeenCalledOnSelector(".foo .jspHorizontalBar");
                });

                it("binds the view to resized events on the page", function() {
                    expect(this.page.bind).toHaveBeenCalledWith("resized", jasmine.any(Function), jasmine.any(Object));
                });

                it("binds to the mousewheel event on the container", function() {
                    expect($.fn.bind).toHaveBeenCalledOnSelector(".foo .jspContainer");
                    expect($.fn.bind).toHaveBeenCalledWith("mousewheel", jasmine.any(Function));
                });

                context("when called again", function() {
                    beforeEach(function() {
                        this.page.bind.reset();
                        $.fn.hide.reset();
                        $.fn.jScrollPane.reset();
                        $.fn.bind.reset();
                        spyOn(this.view.subfoo, "bind").andCallThrough();
                        this.view.setupScrolling(".foo");
                    });

                    it("calls jScrollPane", function() {
                        expect($.fn.jScrollPane).toHaveBeenCalledOnSelector(".foo");
                    });

                    it("hides the scrollbars initially", function() {
                        expect($.fn.hide).toHaveBeenCalledOnSelector(".foo .jspVerticalBar");
                        expect($.fn.hide).toHaveBeenCalledOnSelector(".foo .jspHorizontalBar");
                    });

                    it("does not re-bind the view to resized events on the page", function() {
                        expect(this.page.bind).not.toHaveBeenCalledWith("resized", jasmine.any(Function), jasmine.any(Object));
                    });

                    it("does not re-bind to the mousewheel event on the container", function() {
                        expect($.fn.bind).not.toHaveBeenCalledOnSelector(".foo .jspContainer");
                    });
                });

                describe("when a resized event occurs", function() {
                    beforeEach(function() {
                        spyOn(this.view.$(".foo").data("jsp"), "reinitialise");
                        this.page.trigger("resized");
                    });

                    it("recalculates scrolling", function() {
                        expect(this.view.$(".foo").data("jsp").reinitialise).toHaveBeenCalled();
                    });
                });

                describe("when a mousewheel event occurs", function() {
                    beforeEach(function() {
                        this.event = jQuery.Event("mousewheel");
                        this.view.$(".jspContainer").trigger(this.event);
                    });

                    it("prevents default", function() {
                        expect(this.event.isDefaultPrevented()).toBeTruthy();
                    });
                });

                describe("when a subview is re-rendered", function() {
                    beforeEach(function() {
                        this.view.recalculateScrolling.reset();
                        this.view.subfoo.render();
                    });

                    it("recalculates scrolling", function() {
                        expect(this.view.recalculateScrolling).toHaveBeenCalled();
                    });
                });

                describe("when a subview triggers content:changed", function() {
                    beforeEach(function() {
                        this.view.recalculateScrolling.reset();
                        chorus.PageEvents.broadcast("content:changed");
                    });

                    it("recalculates scrolling", function() {
                        expect(this.view.recalculateScrolling).toHaveBeenCalled();
                    });
                });

                describe("when the element scrolls", function() {
                    beforeEach(function() {
                        spyOnEvent(this.view, 'scroll');
                        this.view.$(".foo").trigger("jsp-scroll-y");
                    });

                    it("triggers the 'scroll' event on itself", function() {
                        expect('scroll').toHaveBeenTriggeredOn(this.view);
                    });
                });

                describe("delegateEvents", function() {
                    var noEventsClass = chorus.views.Bare.extend({
                        template: function() {
                            return '<div class="hello world"></div>';
                        }
                    });
                    var noEventsChildClass = noEventsClass.extend({
                        events: {
                            "click .world": 'noEventsChildFunction'
                        },
                        noEventsChildFunction: jasmine.createSpy('noEventsChildFunction')
                    });
                    var grandparentViewClass = chorus.views.Bare.extend({
                        events: {
                            "click .world": 'grandparentFunction',
                            "click .hello": "badFunction"
                        },
                        template: function() {
                            return '<div class="hello world"></div>';
                        },
                        grandparentFunction: jasmine.createSpy('grandparentFunction'),
                        badFunction: jasmine.createSpy('badFunction')
                    });
                    var parentViewClass = grandparentViewClass.extend({
                        events: {
                            "click .hello": 'parentFunction'
                        },

                        parentFunction: jasmine.createSpy('parentFunction')
                    });
                    var childViewClass = parentViewClass.extend({
                        events: {
                            "click div.hello": 'childFunction'
                        },
                        childFunction: jasmine.createSpy('childFunction')
                    });

                    it("binds all sets of events", function() {
                        this.view = new childViewClass();
                        this.view.render();
                        this.view.$('.hello').click();
                        expect(this.view.childFunction).toHaveBeenCalled();
                        expect(this.view.parentFunction).toHaveBeenCalled();
                        expect(this.view.grandparentFunction).toHaveBeenCalled();
                        expect(this.view.badFunction).not.toHaveBeenCalled();
                    });

                    it("works if there are no events", function() {
                        this.view = new noEventsClass();
                        this.view.render();
                        expect(this.view.$('.hello')).toExist();
                    });

                    it("works if the parent has no events", function() {
                        this.view = new noEventsChildClass();
                        this.view.render();
                        this.view.$('.hello').click();
                        expect(this.view.noEventsChildFunction).toHaveBeenCalled();
                    });
                });
            });

            context("when called after teardown (due to the defer)", function() {
                beforeEach(function() {
                    this.view.teardown();
                    spyOn(chorus.PageEvents, "subscribe");
                    spyOn(this.view.bindings, "add");
                    this.view.setupScrolling(".foo");
                });

                it("does not bind anything to the view", function() {
                    expect($.fn.bind).not.toHaveBeenCalled();
                    expect(chorus.PageEvents.subscribe).not.toHaveBeenCalled();
                    expect(this.view.bindings.add).not.toHaveBeenCalled();
                });
            });
        });

        describe("#subscribePageEvent", function() {
            beforeEach(function() {
                this.view = new chorus.views.Bare();
            });

            it("pushes a new subscription handle to the subscriptions array", function() {
                expect(this.view.subscriptions.length).toBe(0);
                this.view.subscribePageEvent("testevent", function() {}, this.view, "123");
                expect(this.view.subscriptions.length).toBe(1);
                var handle = this.view.subscriptions[0];
                expect(chorus.PageEvents.subscriptionHandles[handle].eventName).toEqual("testevent");
            });

            it("pushes a new subscription handle to the subscriptions array with default context", function() {
                expect(this.view.subscriptions.length).toBe(0);
                this.view.subscribePageEvent("testevent", function() {});
                expect(this.view.subscriptions.length).toBe(1);
                var handle = this.view.subscriptions[0];
                expect(chorus.PageEvents.subscriptionHandles[handle].binding.context).toBe(this.view);
            });

            it("pushes a new subscription handle to the subscriptions array with default context and specified id", function() {
                expect(this.view.subscriptions.length).toBe(0);
                this.view.subscribePageEvent("testevent", function() {}, "123");
                expect(this.view.subscriptions.length).toBe(1);
                var handle = this.view.subscriptions[0];
                expect(chorus.PageEvents.subscriptionHandles[handle].binding.context).toBe(this.view);
                expect(chorus.PageEvents.subscriptionHandles[handle].id).toBe("123");
            });
        });

        describe("#teardown", function() {
            beforeEach(function() {
                this.view = new chorus.views.Bare();
                this.view.templateName = "plain_text";
                this.view.context = function() { return { text: "Foo" }; };

                $("#jasmine_content").append($(this.view.render().el));
                expect($(this.view.el).closest("#jasmine_content")).toExist();

                this.model = new chorus.models.Base();
                this.view.requiredResources.add(this.model);
                this.subViewObject = stubView();
                spyOn(this.subViewObject, "teardown");
                this.view.registerSubView(this.subViewObject);

                spyOn(this.view, "unbind");
                spyOn(this.view.bindings, "removeAll");
                expect(this.view.requiredResources.models.length).toBe(1);

                spyOn(chorus.PageEvents, "unsubscribe");
                this.handle = chorus.PageEvents.subscribe("foo", this.view.render, this.view);
                this.view.subscriptions.push(this.handle);

                this.view.teardown();
            });

            it("sets torndown to true", function() {
                expect(this.view.torndown).toBeTruthy();
            });

            it("should call cleanup functions", function() {
                expect(this.view.unbind).toHaveBeenCalled();
                expect(this.view.bindings.removeAll).toHaveBeenCalled();
                expect(_.isEmpty(this.view.requiredResources.models)).toBeTruthy();
            });

            it("should remove itself from the DOM", function() {
                expect($(this.view.el).closest("#jasmine_content")).not.toExist();
            });

            it("should tear down registered subviews", function() {
                expect(this.subViewObject.teardown).toHaveBeenCalled();
            });

            it("unsubscribe subscriptions", function(){
               expect(chorus.PageEvents.unsubscribe).toHaveBeenCalledWith(this.handle);
            });

            describe("when the teardown function is told to preserve the container", function() {

                beforeEach(function() {
                    this.view = new chorus.views.Bare();
                    this.view.templateName = "plain_text";
                    this.view.context = function() { return { text: "Foo" }; };

                    $("#jasmine_content").append($(this.view.render().el));
                    expect($(this.view.el).closest("#jasmine_content")).toExist();

                    this.view.teardown(true);
                });
                it("keeps itself in the DOM", function() {
                    expect($(this.view.el).closest("#jasmine_content")).toExist();
                });
                it("contains nothing", function() {
                    expect($(this.view.el).html()).toBe("");
                });
            });
        });

        describe("#registerSubViews", function() {
            beforeEach(function() {
                this.view = new chorus.views.Bare();
                this.subViewObject = stubView();
                this.view.registerSubView(this.subViewObject);
            });

            it("adds the view to the subViewObjects array", function() {
               expect(this.view.getSubViews()[0]).toBe(this.subViewObject);
            });

            it("it doesn't add the same view twice", function() {
                this.view.registerSubView(this.subViewObject);
                this.view.registerSubView(this.subViewObject);
                expect(this.view.getSubViews().length).toBe(1);
            });
        });
    });
});
