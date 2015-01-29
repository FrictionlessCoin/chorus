describe("chorus.models.Base", function() {
    beforeEach(function() {
        this.model = new chorus.models.Base({ id: "foo"});
        this.model.urlTemplate = "my_items/{{id}}";
    });

    describe("#url", function() {
        context("when the model's urlTemplate is a function", function() {
            beforeEach(function() {
                this.model.urlTemplate = function() {
                    return "my_other_items/{{id}}";
                };
            });

            it("uses the function's return value", function() {
                expect(this.model.url()).toMatchUrl("/my_other_items/foo");
            });

            it("passes any options to the urlTemplate function", function() {
                spyOn(this.model, 'urlTemplate').andReturn("foo");
                this.model.url({ method: 'create' });
                expect(this.model.urlTemplate).toHaveBeenCalledWith({ method: 'create' });
            });
        });

        it("compiles the urlTemplate and renders it with model attributes", function() {
            expect(this.model.url()).toMatchUrl("/my_items/foo");
        });

        it("compiles the urlTemplate with the model's entityId and entityType", function() {
            this.model.entityId = "45";
            this.model.urlTemplate = "data/{{entityId}}";
            expect(this.model.url()).toBe("/data/45");
        });

        it("does not unescape %2b to +, or otherwise bypass escaping", function() {
            this.model.entityId = "+";
            this.model.urlTemplate = "data/{{encode entityId}}";
            expect(this.model.url()).toBe("/data/%2B");
        });

        context("when the model has additional url params", function() {
            context("when the urlParams is a function", function() {
                beforeEach(function() {
                    this.model.urlParams = function() {
                        return { dance: "the thizzle" };
                    };
                });

                it("passes any options to the urlParams function", function() {
                    spyOn(this.model, 'urlParams').andCallThrough();
                    this.model.url({ method: 'create' });
                    expect(this.model.urlParams).toHaveBeenCalledWith({ method: 'create' });
                });
            });

            context("when the url params are a property", function() {
                beforeEach(function() {
                    this.model.urlParams = { danceDance: "the thizzle" };
                });

                it("url-encodes the params and appends them to the url", function() {
                    expect(this.model.url()).toMatchUrl("/my_items/foo?dance_dance=the+thizzle");
                });

                context("when the base url template includes a query string", function() {
                    beforeEach(function() {
                        this.model.urlTemplate = "my_items/{{id}}?roof=on_fire";
                    });

                    it("merges the query strings properly", function() {
                        expect(this.model.url()).toMatchUrl("/my_items/foo?dance_dance=the+thizzle&roof=on_fire");
                    });
                });
            });
        });

        context("when the model is instantiated with options containing `url`", function() {
            // Backbone 1.0 regression
            it("does not override the url method", function () {
                this.model = new chorus.models.Base({ id: 1 }, { url: "/models/1?parm=true" });
                expect(this.model.url).toBeA(Function);
            });

        });
    });

    describe("activities", function() {
        var model, activities;

        beforeEach(function() {
            model = new chorus.models.User({ id: 24 });
            activities = model.activities();
            expect(activities).toBeA(chorus.collections.ActivitySet);
            expect(activities.url()).toContainQueryParams({entityType: model.entityType, entityId: model.id});
        });

        describe("when the model is invalidated", function() {
            it("fetches the activities", function() {
                model.trigger("invalidated");
                expect(activities).toHaveBeenFetched();
            });
        });

        it("memoizes", function() {
            expect(model.activities()).toBe(activities);
        });
    });

    describe("#isValid", function() {
        it("returns true when the errors hash is empty", function() {
            this.model.errors = {'foo': "your foo is dumb"};
            expect(this.model.isValid()).toBeFalsy();
        });

        it("returns true when the errors hash is not empty", function() {
            this.model.errors = {};
            expect(this.model.isValid()).toBeTruthy();
        });

        it("returns true when the errors hash is falsy", function() {
            this.model.errors = undefined;
            expect(this.model.isValid()).toBeTruthy();
        });
    });

    describe("#save", function() {
        describe("with valid model data", function() {
            beforeEach(function() {
                this.validatedSpy = jasmine.createSpy();
                this.model.bind("validated", this.validatedSpy);
                this.model.save();
                this.savedSpy = jasmine.createSpy();
                this.saveFailedSpy = jasmine.createSpy();
                this.model.bind("saved", this.savedSpy);
                this.model.bind("saveFailed", this.saveFailedSpy);
            });

            it("triggers the validated event", function() {
                expect(this.validatedSpy).toHaveBeenCalled();
            });

            describe("when the request succeeds", function() {
                beforeEach(function() {
                    this.server.lastUpdate().succeed({foo: "hi"});
                });

                it("triggers a saved event", function() {
                    expect(this.savedSpy).toHaveBeenCalled();
                });
            });

            describe("when the request fails", function() {
                beforeEach(function() {
                    this.errors = { fields: { a: { BLANK: {} } } };

                    this.server.lastUpdate().failUnprocessableEntity(this.errors);
                });

                it("returns the error information", function() {
                    expect(this.model.serverErrors).toEqual(this.errors);
                });

                it("triggers a saveFailed event", function() {
                    expect(this.saveFailedSpy).toHaveBeenCalled();
                    var args = this.saveFailedSpy.lastCall().args;
                    expect(args[0]).toBe(this.model);
                });

                describe("and then another request succeeds", function() {
                    beforeEach(function() {
                        this.model.save();
                        this.server.lastUpdate().succeed();
                    });

                    it("should trigger the saved event", function() {
                        expect(this.savedSpy).toHaveBeenCalled();
                    });

                    it("clears the error information", function() {
                        expect(this.model.serverErrors).toBeUndefined();
                    });
                });
            });

            describe("when an error occurs", function() {
                it("handles them correctly", function() {
                    spyOn(this.model, "handleRequestFailure");

                    var options = { someOption: true };
                    this.model.save({}, options);
                    options.error(this.model, "hello");
                    expect(this.model.handleRequestFailure).toHaveBeenCalled();
                });
            });
        });

        describe("when the model is invalid", function() {
            beforeEach(function() {
                this.model.performValidation = function() {
                    return false;
                };
                this.savedSpy = jasmine.createSpy();
                this.model.bind("saved", this.savedSpy);
                this.validationFailedSpy = jasmine.createSpy();
                this.model.bind("validationFailed", this.validationFailedSpy);
                spyOn(Backbone.Model.prototype, "save");
            });

            it("returns false", function() {
                expect(this.model.save()).toBeFalsy();
            });

            it("does not save the object", function() {
                this.model.save();
                expect(Backbone.Model.prototype.save).not.toHaveBeenCalled();
            });

            it("triggers validationFailed", function() {
                this.model.save();
                expect(this.validationFailedSpy).toHaveBeenCalled();
            });
        });

        context("when attributes are passed to the save method", function() {
            beforeEach(function() {
                this.model.declareValidations = function(newAttrs) {
                    this.require('requiredAttr', newAttrs);
                };

                this.model.set({requiredAttr: 'foo'});
                this.validationFailedSpy = jasmine.createSpy();
                this.model.bind("validationFailed", this.validationFailedSpy);
                this.validatedSpy = jasmine.createSpy();
                this.model.bind("validated", this.validatedSpy);
                spyOn(Backbone.Model.prototype, "save");
            });

            context("when the attrs are valid", function() {
                beforeEach(function() {
                    this.model.save({requiredAttr: "bar"});
                });

                it("saves the model", function() {
                    expect(Backbone.Model.prototype.save).toHaveBeenCalled();
                });

                it("triggers validated", function() {
                    expect(this.validatedSpy).toHaveBeenCalled();
                });

                describe("and beforeSave makes a change to the attrs", function() {
                    beforeEach(function() {
                        spyOn(this.model, "beforeSave").andCallFake(function(attrs, options) {
                            attrs.otherAttr = "foo";
                        });

                        Backbone.Model.prototype.save.reset();
                        this.model.save({ requiredAttr: "bar" });
                    });

                    it("saves the changed attrs", function() {
                        expect(Backbone.Model.prototype.save).toHaveBeenCalledWith({
                            requiredAttr: "bar",
                            otherAttr: "foo"
                        }, jasmine.any(Object));
                    });
                });

                describe("and beforeSave does not make any changes to the attrs", function() {
                    it("saves the unchanged attrs", function() {
                        expect(Backbone.Model.prototype.save).toHaveBeenCalledWith(
                            { requiredAttr: "bar" }, jasmine.any(Object));
                    });
                });
            });

            context("when the attrs are invalid", function() {
                beforeEach(function() {
                    this.model.save({requiredAttr: ""});
                });

                it("does not save the model", function() {
                    expect(Backbone.Model.prototype.save).not.toHaveBeenCalled();
                });

                it("triggers validationFailed", function() {
                    expect(this.validationFailedSpy).toHaveBeenCalled();
                });
            });
        });

        context("when no attributes are passed to the save method", function() {
            beforeEach(function() {
                this.model.set({requiredAttr: 'foo'});
                spyOn(Backbone.Model.prototype, "save");
            });

            describe("and beforeSave makes a change to the attrs", function() {
                beforeEach(function() {
                    spyOn(this.model, "beforeSave").andCallFake(function(attrs, options) {
                        attrs.otherAttr = "foo";
                    });

                    this.model.save();
                });

                it("saves the changed attrs", function() {
                    expect(Backbone.Model.prototype.save).toHaveBeenCalledWith({
                        otherAttr: "foo"
                    }, jasmine.any(Object));
                });
            });

            describe("and beforeSave does not make any changes to the attrs", function() {
                beforeEach(function() {
                    this.model.save();
                });

                it("saves the unchanged attrs", function() {
                    expect(Backbone.Model.prototype.save).toHaveBeenCalledWith(undefined, jasmine.any(Object));
                });
            });
        });

        it("calls the 'beforeSave' hook", function() {
            spyOn(this.model, 'beforeSave');
            var attrs = {foo: 'bar'};
            this.model.save(attrs, { silent: true });

            expect(this.model.beforeSave).toHaveBeenCalled();
            var beforeSaveArgs = this.model.beforeSave.nthCall(0).args;
            expect(beforeSaveArgs[0]).toEqual(attrs);

            // the options hash gets mutated later in #save
            expect(beforeSaveArgs[1].silent).toBeTruthy();
        });
    });

    describe("#destroy", function() {
        beforeEach(function() {
            this.destroySpy = jasmine.createSpy();
            this.destroyFailedSpy = jasmine.createSpy();
            this.model.bind("destroy", this.destroySpy);
            this.model.bind("destroyFailed", this.destroyFailedSpy);
            this.model.destroy();
        });

        describe("when the request succeeds", function() {
            beforeEach(function() {
                this.server.lastDestroy().succeed();
            });

            it("triggers a destroy event", function() {
                expect(this.destroySpy).toHaveBeenCalled();
            });

            it("does not trigger a destroyFailed event", function() {
                expect(this.destroyFailedSpy).not.toHaveBeenCalled();
            });
        });

        describe("when the request fails", function() {
            beforeEach(function() {
                this.server.lastDestroy().failUnprocessableEntity({ record: "not_found"});
            });

            it("triggers a destroyFailed event", function() {
                expect(this.destroyFailedSpy).toHaveBeenCalled();
            });

            it("does not trigger a destroy event", function() {
                expect(this.destroySpy).not.toHaveBeenCalled();
            });

            it("returns the error information", function() {
                expect(this.model.serverErrors).toEqual({ record: "not_found" });
            });
        });

        describe("when an unexpected error occurs", function() {
            beforeEach(function() {
                spyOn(chorus, 'toast');
                this.server.lastDestroy().failServerError();
            });

            it("responds to the errors", function() {
                expect(chorus.toast).toHaveBeenCalledWith("server_error", {toastOpts: {}});
            });
        });
    });

    describe("#isDeleted", function() {
        it("is true when the isDeleted attribute is equal to 'true'", function() {
            this.model.set({isDeleted: 'true'});
            expect(this.model.isDeleted()).toBeTruthy();
        });

        it("is true when the isDeleted attribute is equal to true", function() {
            this.model.set({isDeleted: true});
            expect(this.model.isDeleted()).toBeTruthy();
        });

        it("is false when the isDeleted attribute is equal to any other string", function() {
            this.model.set({isDeleted: 'any other string'});
            expect(this.model.isDeleted()).toBeFalsy();
        });

        it("is false when the isDeleted attribute is equal to false", function() {
            this.model.set({isDeleted: false});
            expect(this.model.isDeleted()).toBeFalsy();
        });

        it("is false when the isDeleted attribute is missing", function() {
            expect(this.model.isDeleted()).toBeFalsy();
        });
    });

    describe("before parsing", function() {
        it("is not loaded", function() {
            expect(this.model.loaded).toBeFalsy();
        });
    });

    describe("#require", function() {
        beforeEach(function() {
            this.model.errors = {};
        });

        it("sets an error if the attribute isn't present", function() {
            this.model.require("foo");
            expect(this.model.errors.foo).toBeDefined();
        });

        it("does not clobber a previously-existing error", function() {
            this.model.errors["foo"] = "nope";
            this.model.require("foo");
            expect(this.model.errors.foo).toBe("nope");
        });

        it("sets an error if the attribute is present, is a String, and contains only whitespace", function() {
            this.model.set({ foo: "    " });
            this.model.require("foo");
            expect(this.model.errors.foo).toBeDefined();
        });

        it("sets an error if the attribute is present, is a String, and contains only whitespace and html tags", function() {
            this.model.set({ foo: "   &nbsp;<br/> " });
            this.model.require("foo");
            expect(this.model.errors.foo).toBeDefined();
        });

        it("does not set an error if the attribute is present", function() {
            this.model.set({ foo: "bar" });
            this.model.require("foo");
            expect(this.model.errors.foo).not.toBeDefined();
        });

        it("contains the attr name", function() {
            this.model.require("foo");
            expect(this.model.errors.foo).toContain("foo");
        });

        it("sets an error if newAttrs is invalid but the existing value is valid", function() {
            this.model.set({foo: "bar"});
            this.model.require("foo", {foo: ""});

            expect(this.model.errors.foo).toBeDefined();
        });

        it("does not set an error if the newAttrs is valid", function() {
            this.model.set({foo: "bar"});
            this.model.require("foo", {foo: "quux"});

            expect(this.model.errors.foo).not.toBeDefined();
        });

        it("uses a custom error message, if provided", function() {
            this.model.require("foo", {foo: ""}, "test.mouse");
            expect(this.model.errors.foo).toMatchTranslation("test.mouse");
        });


        context("model has attrToLabel set", function() {
            beforeEach(function() {
                this.model.attrToLabel = {
                    "foo": "users.first_name"
                };
            });

            it("includes the translation in the error message", function() {
                this.model.require("foo");
                expect(this.model.errors.foo).toContain(t("users.first_name"));
            });
        });
    });

    describe("requirePattern", function() {
        beforeEach(function() {
            this.model.errors = {};
        });

        it("sets an error if the attribute isn't present", function() {
            this.model.requirePattern("foo");
            expect(this.model.errors.foo).toBeDefined();
        });

        it("does not clobber a previously-existing error", function() {
            this.model.errors["foo"] = "nope";
            this.model.requirePattern("foo");
            expect(this.model.errors.foo).toBe("nope");
        });
        it("sets an error if the attribute is present but doesn't match the pattern", function() {
            this.model.set({ foo: "bar" });
            this.model.requirePattern("foo", /baz/);
            expect(this.model.errors.foo).toBeDefined();
        });

        it("does not set an error if the attribute is present and matches the pattern", function() {
            this.model.set({ foo: "bar" }, { silent: true });
            this.model.requirePattern("foo", /bar/);
            expect(this.model.errors.foo).not.toBeDefined();
        });

        it("contains the attr name in the error", function() {
            this.model.requirePattern("foo", /hello/);
            expect(this.model.errors.foo).toContain("foo");
        });

        it("sets an error if newAttrs is invalid but the existing value is valid", function() {
            this.model.set({foo: "bar"});
            this.model.requirePattern("foo", /bar/, {foo: ""});

            expect(this.model.errors.foo).toBeDefined();
        });

        it("does not set an error if the newAttrs is valid", function() {
            this.model.set({foo: "123"});
            this.model.requirePattern("foo", /\d+/, {foo: "456"});

            expect(this.model.errors.foo).not.toBeDefined();
        });

        it("uses a custom error message, if provided", function() {
            this.model.requirePattern("foo", /hello/, {}, "test.mouse");
            expect(this.model.errors.foo).toMatchTranslation("test.mouse");
        });

        context("model has attrToLabel set", function() {
            beforeEach(function() {
                this.model.attrToLabel = {
                    "foo": "users.first_name"
                };
            });

            it("includes the translation in the error message", function() {
                this.model.require("foo", /hello/);
                expect(this.model.errors.foo).toContain(t("users.first_name"));
            });
        });
    });

    describe("requireConfirmation", function() {
        beforeEach(function() {
            this.model.errors = {};
        });

        it("sets an error if the attribute isn't present", function() {
            this.model.requireConfirmation("foo");
            expect(this.model.errors.foo).toBeDefined();
        });

        it("does not clobber a previously-existing error", function() {
            this.model.errors["foo"] = "nope";
            this.model.requireConfirmation("foo");
            expect(this.model.errors.foo).toBe("nope");
        });

        it("sets an error if the confirmation isn't present", function() {
            this.model.set({ foo: "bar" });
            this.model.requireConfirmation("foo");
            expect(this.model.errors.foo).toBeDefined();
        });

        it("sets an error if the confirmation doesn't match the attribute", function() {
            this.model.set({ foo: "bar", fooConfirmation: "baz" });
            this.model.requireConfirmation("foo");
            expect(this.model.errors.foo).toBeDefined();
        });

        it("does not set an error if the confirmation matches the attribute", function() {
            this.model.set({ foo: "bar", fooConfirmation: "bar" });
            this.model.requireConfirmation("foo");
            expect(this.model.errors.foo).not.toBeDefined();
        });

        it("contains the attr name in the error", function() {
            this.model.set({ foo: "bar", fooConfirmation: "baz" });
            this.model.requireConfirmation("foo");
            expect(this.model.errors.foo).toContain("foo");
        });

        it("sets an error if newAttrs is invalid but the existing value is valid", function() {
            this.model.set({foo: "bar", fooConfirmation: "bar"});
            this.model.requireConfirmation("foo", {foo: "a", fooConfirmation: "b"});

            expect(this.model.errors.foo).toBeDefined();
        });

        it("does not set an error if the newAttrs is valid", function() {
            this.model.set({foo: "123", fooConfirmation: "123"});
            this.model.requireConfirmation("foo", {foo: "456", fooConfirmation: "456"});

            expect(this.model.errors.foo).not.toBeDefined();
        });

        it("throws if newAttrs supplies an original and not a confirmation", function() {
            this.model.set({foo: "123", fooConfirmation: "123"});

            try {
                this.model.requireConfirmation("foo", {foo: "456"});
                expect("should never get here").toBe("wtf");
            } catch (e) {
                // test passed
            }
        });

        it("uses a custom error message, if provided", function() {
            this.model.set({foo: "bar", fooConfirmation: "bar"});
            this.model.requireConfirmation("foo", {foo: "a", fooConfirmation: "b"}, "test.mouse");
            expect(this.model.errors.foo).toMatchTranslation("test.mouse");
        });

        context("model has attrToLabel set", function() {
            beforeEach(function() {
                this.model.attrToLabel = {
                    "foo": "users.first_name"
                };
            });

            it("includes the translation in the error message", function() {
                this.model.set({ foo: "bar", fooConfirmation: "baz" });
                this.model.requireConfirmation("foo");
                expect(this.model.errors.foo).toContain(t("users.first_name"));
            });
        });
    });

    describe("requireIntegerRange", function() {
        beforeEach(function() {
            this.model.errors = {};
        });

        it("sets an error if the attribute isn't present", function() {
            this.model.requireIntegerRange("foo", 5, 10);
            expect(this.model.errors.foo).toBeDefined();
        });

        it("does not clobber a previously-existing error", function() {
            this.model.errors["foo"] = "nope";
            this.model.requireIntegerRange("foo", 5, 10);
            expect(this.model.errors.foo).toBe("nope");
        });

        it("sets an error if the attribute is present but less than the range minimum", function() {
            this.model.set({ foo: 1});
            this.model.requireIntegerRange("foo", 5, 10);
            expect(this.model.errors.foo).toBeDefined();
        });

        it("sets an error if the attribute is present but greater than the range maximum", function() {
            this.model.set({ foo: 11});
            this.model.requireIntegerRange("foo", 5, 10);
            expect(this.model.errors.foo).toBeDefined();
        });

        it("sets an error if newAttrs is invalid but the existing value is valid", function() {
            this.model.set({foo: 6});
            this.model.requireIntegerRange("foo", 5, 10, {foo: "12"});

            expect(this.model.errors.foo).toBeDefined();
        });

        it("does not set an error if the newAttrs is valid", function() {
            this.model.set({foo: "bar"});
            this.model.requireIntegerRange("foo", 5, 10, {foo: 8});
            expect(this.model.errors.foo).not.toBeDefined();
        });

        it("uses a custom error message, if provided", function() {
            this.model.set({ foo: 11});
            this.model.requireIntegerRange("foo", 5, 10, {}, "test.mouse");
            expect(this.model.errors.foo).toMatchTranslation("test.mouse");
        });
    });

    describe("hasOwnPage", function() {
        it("returns false", function() {
            var model = new chorus.models.Base();
            expect(model.hasOwnPage()).toBeFalsy();
        });
    });

    describe("highlightedAttribute", function() {
        beforeEach(function() {
            this.model.set({
                highlightedAttributes: {
                    name: '<em>foo</em>',
                    otherThing: [
                        '<em>flarp</em>'
                    ]
                },
                name: 'foo',
                title: 'foop',
                trouble: '<script>evilFunction()</script>bye'
            });
        });

        it("returns the highlighted attribute", function() {
            expect(this.model.highlightedAttribute('name')).toBe('<em>foo</em>');
        });

        it("returns the first highlighted attribute when it is an array", function() {
            expect(this.model.highlightedAttribute('otherThing')).toBe('<em>flarp</em>');
        });

        it("does not return the regular attribute if no highlighted one exists", function() {
            expect(this.model.highlightedAttribute('title')).toBeUndefined();
        });
    });

    describe("#name", function() {
        context("when the model has a nameAttribute set", function() {
            beforeEach(function() {
                this.model.set({iAmAName: 'jerry'});
                this.model.nameAttribute = 'iAmAName';
            });

            it("returns that attribute", function() {
                expect(this.model.name()).toBe('jerry');
            });
        });

        context("when the model has a nameFunction set", function() {
            beforeEach(function() {
                this.model.set({fName: 'herbert', lName: 'humphrey'});
                this.model.iAmANameFunction = function() {
                    return this.get("fName") + ' ' + this.get("lName");
                };
                this.model.nameFunction = 'iAmANameFunction';
            });

            it("returns the result of that function", function() {
                expect(this.model.name()).toBe('herbert humphrey');
            });
        });

        context("when the model doesn't have a nameAttribute or nameFunction", function() {
            beforeEach(function() {
                delete this.model.nameAttribute;
                delete this.model.nameFunction;
                this.model.set({name: "Mark"});
            });
            it("returns the name attribute", function() {
                expect(this.model.name()).toBe("Mark");
            });
        });
    });

    describe("#shortName", function() {
        beforeEach(function() {
            this.model.set({name: "SomeName"});
        });

        it("returns the name if the name is already short enough", function() {
            expect(this.model.shortName(20)).toBe("SomeName");
        });

        it("ellipsizes long names", function() {
            expect(this.model.shortName(3)).toBe("Som…");
        });
    });

    describe("highlightedName", function() {
        context("when the model has a nameAttribute set", function() {
            beforeEach(function() {
                this.model.set({
                    iAmAName: '<script>evilFunction("hi!")</script>jerry',
                    highlightedAttributes: {
                        iAmAName: '<em>jerry</em>'
                    }
                });
                this.model.nameAttribute = 'iAmAName';
            });

            it("returns the highlighted attribute", function() {
                expect(this.model.highlightedName().toString()).toBe('<em>jerry</em>');
                expect(this.model.highlightedName()).toBeA(Handlebars.SafeString);
            });

            it("returns the regular attribute when the highlighted one does not exist", function() {
                delete this.model.get('highlightedAttributes').iAmAName;
                expect(this.model.highlightedName().toString()).toBe('&lt;script&gt;evilFunction(&quot;hi!&quot;)&lt;/script&gt;jerry');
                expect(this.model.highlightedName()).toBeA(Handlebars.SafeString);
            });
        });

        context("when the model has a nameFunction set", function() {
            beforeEach(function() {
                this.model.set({
                    fName: '<script>evilFunction("hi!")</script>herbert',
                    lName: 'humphrey',
                    highlightedAttributes: {
                        fName: '<em>herbert</em>'
                    }
                });
                this.model.iAmANameFunction = function() {
                    return this.get("fName") + ' ' + this.get("lName");
                };
                this.model.nameFunction = 'iAmANameFunction';
            });

            it("returns the function with highlighted results", function() {
                expect(this.model.highlightedName().toString()).toBe('<em>herbert</em> humphrey');
                expect(this.model.highlightedName()).toBeA(Handlebars.SafeString);
            });

            it("returns the function with regular attribute when the highlighted ones do not exist", function() {
                delete this.model.get('highlightedAttributes').fName;
                expect(this.model.highlightedName().toString()).toBe('&lt;script&gt;evilFunction(&quot;hi!&quot;)&lt;/script&gt;herbert humphrey');
                expect(this.model.highlightedName()).toBeA(Handlebars.SafeString);
            });
        });
    });

    describe("#toJSON", function() {
        beforeEach(function() {
            this.model.set({
                "firstName": "Lenny"
            });
        });

        context("when parameterWrapper is not defined", function() {
            context("and constructorName is defined", function() {
                beforeEach(function() {
                    this.model.constructorName = "FlimFlam";
                });

                it("scopes the attributes under the lowercased constructorName, converted to snake case", function() {
                    var params = this.model.toJSON();
                    expect(params.flim_flam).toBeDefined();
                    expect(params.flim_flam.first_name).toBe("Lenny");
                });
            });

            context("and constructorName is not defined", function() {
                it("converts the model's attributes to snake case", function() {
                    expect(this.model.toJSON().first_name).toEqual("Lenny");
                });
            });
        });

        context("when parameterWrapper is defined", function() {
            beforeEach(function() {
                this.model.parameterWrapper = "foo";
            });

            it("scopes the attributes under the parameterWrapper key, converted to snake case", function() {
                var params = this.model.toJSON();
                expect(params.foo).toBeDefined();
                expect(params.foo.first_name).toBe("Lenny");
            });

            context("when nestParams is false", function() {
                it("does not nest the params", function() {
                    this.model.nestParams = false;
                    var params = this.model.toJSON();
                    expect(params.foo).not.toBeDefined();
                    expect(params.first_name).toBe("Lenny");
                });
            });
        });

        context("when paramsToSave are defined", function() {
            beforeEach(function() {
                this.model.paramsToSave = ['firstName', 'lastName'];
                this.model.set({lastName: 'sandwich'});
            });

            it("only returns the specified parameters", function() {
                var params = this.model.toJSON();
                expect(params.first_name).toBe("Lenny");
                expect(params.last_name).toBe("sandwich");
                expect(params.id).not.toBeDefined();
                expect(_.keys(params).length).toBe(2);
            });

            context("when the paramToSave refers to a function name", function() {
                beforeEach(function() {
                    this.model.paramsToSave = ['firstName', 'iAmFunction'];
                    this.model.iAmFunction = function() {
                        return 'potato pants';
                    };
                });

                it("uses the result of that function", function() {
                    var params = this.model.toJSON();
                    expect(params.first_name).toBe("Lenny");
                    expect(params.i_am_function).toBe("potato pants");
                    expect(_.keys(params).length).toBe(2);
                });
            });

            context("when paramsToIgnore are defined", function() {
                beforeEach(function() {
                    this.model.paramsToIgnore = ['firstName'];
                    this.model.set({lastName: 'sandwich'});
                });

                it("should not remove attrs in the paramsToIgnore list", function() {
                    var params = this.model.toJSON();
                    expect(params.first_name).toBeDefined();
                    expect(params.last_name).toBe("sandwich");
                    expect(params.id).not.toBeDefined();
                    expect(_.keys(params).length).toBe(2);
                });
            });
        });

        context("when paramsToIgnore are defined", function() {
            beforeEach(function() {
                this.model.paramsToIgnore = ['firstName'];
                this.model.set({lastName: 'sandwich'});
            });

            it("excludes the specified parameters from being returned", function() {
                var params = this.model.toJSON();
                expect(params.first_name).not.toBeDefined();
                expect(params.last_name).toBe("sandwich");
                expect(params.id).toBeDefined();
                expect(_.keys(params).length).toBe(2);
            });
        });

        it("removes undefined or null parameters", function() {
            this.model.set("firstName", undefined);
            this.model.set("lastName", null);
            var params = this.model.toJSON();
            expect(_.has(params, 'first_name')).toBeFalsy();
            expect(_.has(params, 'last_name')).toBeFalsy();
        });
    });

    describe("unsavedChanges", function() {
        beforeEach(function() {
            this.model = new chorus.models.Base();
            this.model.urlTemplate = "model_with_changes";
        });

        context("without changes", function() {
            it("returns an empty hash", function() {
                expect(this.model.unsavedChanges()).toEqual({});
            });
        });

        context("when attributes has been changed", function() {
            beforeEach(function() {
                this.model.set({attr1: 'new value'});
                this.model.attributes.attr2 = 'other new value';
            });

            it("returns a hash with the new values and old values as undefined", function() {
                var changes = this.model.unsavedChanges();
                expect(changes.attr1.oldValue).toBe(undefined);
                expect(changes.attr1.newValue).toBe('new value');
                expect(changes.attr2.oldValue).toBe(undefined);
                expect(changes.attr2.newValue).toBe('other new value');
            });

            context("after fetching data", function() {
                beforeEach(function() {
                    this.model.fetch();
                    this.server.completeFetchFor(this.model, {attr2: 'something different', attr3: 'brand new attr'});
                });

                it("has unfetched changes still", function() {
                    var changes = this.model.unsavedChanges();
                    expect(changes.attr1.oldValue).toBe(undefined);
                    expect(changes.attr1.newValue).toBe('new value');
                    expect(changes.attr2).toBeFalsy();
                    expect(changes.attr3).toBeFalsy();
                });

                context("when attributes has been changed", function() {
                    beforeEach(function() {
                        this.model.set({attr1: 'newer value'});
                        this.model.attributes.attr2 = 'other new value';
                    });

                    it("returns a hash with the new and old values included", function() {
                        var changes = this.model.unsavedChanges();
                        expect(changes.attr1.oldValue).toBe(undefined);
                        expect(changes.attr1.newValue).toBe('newer value');
                        expect(changes.attr2.oldValue).toBe('something different');
                        expect(changes.attr2.newValue).toBe('other new value');
                    });
                });
            });

            context("after saving model", function() {
                beforeEach(function() {
                    this.model.save();
                    this.server.completeCreateFor(this.model, {attr2: 'something different', attr3: 'brand new attr'});
                });

                it("has unsaved changes still", function() {
                    var changes = this.model.unsavedChanges();
                    expect(changes.attr1.oldValue).toBe(undefined);
                    expect(changes.attr1.newValue).toBe('new value');
                    expect(changes.attr2).toBeFalsy();
                    expect(changes.attr3).toBeFalsy();
                });
            });
        });
    });

    describe("#set", function() {
        context("when we pass a model to the constructor of an model", function () {
            it("creates a new model with the attributes of the parameter", function() {
                var parameterModel = backboneFixtures.user({ firstName: "Santa", lastName: "Claus" });
                this.model = new chorus.models.Base(parameterModel);

                expect(this.model.get("firstName")).toBe(parameterModel.get("firstName"));
            });

            it ("does not create the functions of a parameter model on the new model", function () {
                var parameterModel = backboneFixtures.user({ firstName: "Santa", lastName: "Claus" });
                this.model = new chorus.models.Base(parameterModel);

                expect(this.model.workspaces).toBeUndefined();
            });
        });

        context("when the attributes has completeJson set to true", function() {
            it("sets the model as loaded", function() {
                var model = new chorus.models.Base();
                model.set({completeJson: true});
                expect(model.loaded).toBeTruthy();
            });

            it("sets the status code to no content if not already set", function() {
                var model = new chorus.models.Base();
                model.set({completeJson: true});
                expect(model.statusCode).toBe(204);
            });

            it("leaves the status code alone if already set", function() {
                var model = new chorus.models.Base();
                model.statusCode = 123;
                model.set({completeJson: true});
                expect(model.statusCode).toBe(123);
            });
        });

        context("when the attributes do not have completeJson set to true", function() {
            it("does not set the model as loaded", function() {
                this.model = new chorus.models.Base();
                this.model.set({});
                expect(this.model.loaded).not.toBeTruthy();
            });
        });
    });

    describe("#shouldTriggerImmediately", function() {
        context("when the argument is 'loaded'", function() {
            it("returns true if the model is loaded", function() {
                this.model.loaded = true;
                expect(this.model.shouldTriggerImmediately("loaded")).toBeTruthy();
            });
            it("returns false if the model is NOT loaded", function() {
                this.model.loaded = false;
                expect(this.model.shouldTriggerImmediately("loaded")).toBeFalsy();
            });
        });
        it("returns false for any other arguments", function() {
            _.each(["change", "reset", "saveFailed", "validationFailed"], function(eventName) {
                expect(this.model.shouldTriggerImmediately(eventName)).toBeFalsy();
            }, this);
        });

    });
});

