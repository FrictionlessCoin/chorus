describe("chorus.BindingGroup", function() {
    beforeEach(function() {
        var viewClass = chorus.views.Base.extend({
            render: function() {
                return "hello";
            }
        });

        this.view1 = new viewClass();
        this.view2 = new viewClass();
        this.model1 = new chorus.models.Base();
        this.model2 = new chorus.models.Base();

        spyOn(this.view1, 'render').andCallThrough();
        spyOn(this.view2, 'render').andCallThrough();

        this.bindingGroup = new chorus.BindingGroup(this.view1);

        stubDefer();
    });

    describe("#add(object, eventName, callback [, context])", function() {
        context("when a context is passed as the fourth parameter", function() {
            beforeEach(function() {
                this.bindingGroup.add(this.model1, 'change', this.view1.render, this.view2);
                this.bindingGroup.add(this.model1, 'change', this.view1.render, this.view2);
            });

            it("binds the callback to be called when the event is triggered", function() {
                this.model1.trigger("change");
                expect(this.view1.render).toHaveBeenCalled();
            });

            it("binds the callback to be called in the given context when the event is triggered", function() {
                this.model1.trigger("change");
                expect(this.view1.render.mostRecentCall.object).toBe(this.view2);
            });

            it("only binds once", function() {
                this.model1.trigger("change");
                expect(this.view1.render.callCount).toBe(1);
            });


        });

        it("does not call the event immediately", function() {
            var changeSpy = jasmine.createSpy("change");
            this.model1.bind("change", changeSpy);
            this.bindingGroup.add(this.model1, 'change', this.view1.render, this.view2);
            expect(changeSpy).not.toHaveBeenCalled();
        });

        context("when the event should be triggered immediately", function() {
            beforeEach(function() {
                this.changeSpy = jasmine.createSpy("change");
                this.model1.shouldTriggerImmediately = function(eventName) {
                    if(eventName === "change") {
                        return true
                    }
                };
                this.model1.bind("change", this.changeSpy);
                this.bindingGroup.add(this.model1, 'change', this.view1.render, this.view2);
            });

            it("triggers the event", function() {
                expect(this.changeSpy).toHaveBeenCalled();
            });
        });

        context("when different contexts are passed", function() {
            beforeEach(function() {
                this.bindingGroup.add(this.model1, 'change', this.view1.render, this.view2);
                this.bindingGroup.add(this.model1, 'change', this.view1.render, this.view1);
            });

            it("treats them as separate bindings", function() {
                this.model1.trigger("change");
                expect(this.view1.render.callCount).toBe(2);
            })
        });

        context("when no context parameter is passed", function() {
            beforeEach(function() {
                this.bindingGroup.add(this.model1, 'change', this.view1.render);
                this.bindingGroup.add(this.model1, 'change', this.view1.render);
            });

            it("calls the callback on the object that was originally passed to the constructor", function() {
                this.model1.trigger("change");
                expect(this.view1.render.mostRecentCall.object).toBe(this.view1);
            });

            it("only binds once", function() {
                this.model1.trigger("change");
                expect(this.view1.render.callCount).toBe(1);
            })
        });

        context("when a space-separated string of event names is passed", function() {
            beforeEach(function() {
                this.bindingGroup.add(this.model1, 'change saved', this.view1.render);
                this.bindingGroup.add(this.model1, 'change saved', this.view1.render);
            });

            it("binds the callback to be called when ANY of the events are triggered", function() {
                this.model1.trigger("change");
                expect(this.view1.render.callCount).toBe(1);
                this.model1.trigger("saved");
                expect(this.view1.render.callCount).toBe(2);
            });

            it("only binds once", function() {
                this.model1.trigger("change");
                expect(this.view1.render.callCount).toBe(1);
                this.view1.render.reset();
                this.model1.trigger("saved");
                expect(this.view1.render.callCount).toBe(1);
            })
        });
    });

    describe("#remove(eventSource, eventName, callback)", function() {
        beforeEach(function() {
            this.bindingGroup.add(this.model1, 'change', this.view1.render);
            this.bindingGroup.add(this.model2, 'change', this.view1.render);
            this.bindingGroup.add(this.model1, 'saved',  this.view1.render);
            this.bindingGroup.add(this.model2, 'saved',  this.view1.render);

            this.bindingGroup.add(this.model1, 'change', this.view2.render, this.view2);
            this.bindingGroup.add(this.model2, 'change', this.view2.render, this.view2);
            this.bindingGroup.add(this.model1, 'saved',  this.view2.render, this.view2);
            this.bindingGroup.add(this.model2, 'saved',  this.view2.render, this.view2);
        });

        context("when an object, event name and callback are passed", function() {
            beforeEach(function() {
                this.bindingGroup.remove(this.model1, 'change', this.view1.render);
            });

            it("unbinds the given callback", function() {
                this.model1.trigger("change");
                expect(this.view1.render).not.toHaveBeenCalled();
            });

            it("leaves other callbacks bound", function() {
                this.model1.trigger("change");
                expect(this.view2.render).toHaveBeenCalled();

                this.model1.trigger("saved");
                expect(this.view1.render).toHaveBeenCalled();

                this.model2.trigger("change");
                expect(this.view1.render).toHaveBeenCalled();
            });
        });

        context("when an object and event name are passed (no callback)", function() {
            beforeEach(function() {
                this.bindingGroup.remove(this.model1, 'change');
            });

            it("unbinds all callbacks for the given event name", function() {
                this.model1.trigger("change");
                expect(this.view1.render).not.toHaveBeenCalled();
                expect(this.view2.render).not.toHaveBeenCalled();
            });

            it("leaves callbacks for other events or objects bound", function() {
                this.model1.trigger("saved");
                expect(this.view1.render).toHaveBeenCalled();

                this.model2.trigger("change");
                expect(this.view1.render).toHaveBeenCalled();
            });
        });

        context("when only an object is passed (no event name or callback)", function() {
            beforeEach(function() {
                this.bindingGroup.remove(this.model1);
            });

            it("unbinds all callbacks on that object", function() {
                this.model1.trigger("change");
                this.model1.trigger("saved");

                expect(this.view1.render).not.toHaveBeenCalled();
                expect(this.view2.render).not.toHaveBeenCalled();
                expect(this.view1.render).not.toHaveBeenCalled();
            });

            it("leaves callbacks for other objects bound", function() {
                this.model2.trigger("change");
                expect(this.view1.render).toHaveBeenCalled();
                expect(this.view2.render).toHaveBeenCalled();
            });
        });

        context("when no arguments are passed, (same as calling #removeAll)", function() {
            it("unbinds all callbacks", function() {
                this.bindingGroup.remove();

                this.model1.trigger("change");
                this.model2.trigger("change");
                this.model1.trigger("saved");
                this.model2.trigger("saved");

                expect(this.view1.render).not.toHaveBeenCalled();
                expect(this.view2.render).not.toHaveBeenCalled();
            });

            it("is equivalent to calling #removeAll", function() {
                this.bindingGroup.removeAll();

                this.model1.trigger("change");
                this.model2.trigger("change");
                this.model1.trigger("saved");
                this.model2.trigger("saved");

                expect(this.view1.render).not.toHaveBeenCalled();
                expect(this.view2.render).not.toHaveBeenCalled();
            });

            it("doesn't unbind things from other binding groups (with different contexts)", function() {
                //It turns out that multiple instances of the same class have identical callbacks as far as
                //Backbone.unbind is concerned, so you could accidentally unbind all callbacks for an entire class
                //of views when you only want to unbind one instance (using spies breaks this, so you can't test directly)

                var differentContext = new chorus.views.Base();
                this.bindingGroup2 = new chorus.BindingGroup(differentContext);
                this.bindingGroup2.add(this.model1, 'change', this.view1.render);
                this.bindingGroup.remove();
                this.model1.trigger("change");
                expect(this.view1.render).toHaveBeenCalled();
            });
        });
    });
});
