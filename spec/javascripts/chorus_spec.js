describe("chorus global", function() {
    beforeEach(function() {
        this.chorus = new window.Chorus();
        this.backboneSpy = spyOn(Backbone.history, "start");
    });

    context("classExtend", function() {
        context("when in chorus dev mode", function() {
            it("applies the customized class name", function() {
                chorus.isDevMode.andReturn(true);
                var SomeClass = chorus.models.Base.extend({ constructorName: "Foo" });
                expect(SomeClass.name).toBe("chorus$Foo");
            });
        });

        context("when in production", function() {
            it("does not receive a custom name", function() {
                chorus.isDevMode.andReturn(false);
                var SomeClass = chorus.models.Base.extend({ constructorName: "Foo" });
                expect(SomeClass.name).toBe("");
            });
        });

        describe("when the class being extended has an 'extended' hook", function() {
            var MyClass, SubClass, extendedSpy;

            beforeEach(function() {
                chorus.isDevMode.andReturn(true);
                extendedSpy = jasmine.createSpy("extended");
                MyClass = chorus.models.Base.extend({}, {
                    extended: extendedSpy
                });
            });

            it("calls the extended hook with the new subclass", function() {
                SubClass = MyClass.extend({ foo: "bar", constructorName: "SubClass" });
                expect(extendedSpy).toHaveBeenCalledWith(SubClass);
            });
        });
    });

    describe("#initialize", function() {
        it("should start the Backbone history after the session has been set", function() {
            var self = this;
            expect(this.chorus.session).toBeUndefined();
            this.backboneSpy.andCallFake(function() {
                expect(self.chorus.session).toBeDefined();
            });
            this.chorus.initialize();
            expect(Backbone.history.start).toHaveBeenCalled();
        });

        it("should create a session", function() {
            this.chorus.initialize();
            expect(this.chorus.session).toBeDefined();
        });

        describe("cache buster generation", function() {
            beforeEach(function() {
                this.time = new Date(2000, 11, 25).getTime();
                this.useFakeTimers(this.time, "Date");
            });

            it("is set in initialization", function() {
                this.chorus.initialize();
                expect(this.chorus.cachebuster()).toBe(this.time);
            });

            it("can be set through chorus#updateCachebuster", function() {
                this.chorus.updateCachebuster();
                expect(this.chorus.cachebuster()).toBe(this.time);
            });
        });
    });

    describe("#afterNavigate", function() {
        beforeEach(function() {
            this.chorus.initialize();

            this.spy1 = jasmine.createSpy();
            this.spy2 = jasmine.createSpy();

            this.chorus.afterNavigate(this.spy1);
            this.chorus.afterNavigate(this.spy2);

            spyOn(this.chorus.PageEvents, "off");
        });

        it("calls the supplied functions after the router triggers leaving", function() {
            expect(this.spy1).not.toHaveBeenCalled();
            expect(this.spy2).not.toHaveBeenCalled();

            this.chorus.router.trigger("leaving");

            expect(this.spy1).toHaveBeenCalled();
            expect(this.spy2).toHaveBeenCalled();

            this.spy1.reset();
            this.spy2.reset();

            this.chorus.router.trigger("leaving");

            expect(this.spy1).not.toHaveBeenCalled();
            expect(this.spy2).not.toHaveBeenCalled();
        });

        it("resets chorus.PageEvents after the router triggers leaving", function() {
            this.chorus.router.trigger("leaving");
            expect(this.chorus.PageEvents.off).toHaveBeenCalled();
        });
    });

    describe("#_navigated", function() {
        beforeEach(function() {
            this.chorus.initialize();
            this.view1 = new chorus.views.Base();
            this.view2 = new chorus.views.Base();
            this.chorus.viewsToTearDown.push(this.view1);
            this.chorus.viewsToTearDown.push(this.view2);
            expect(this.chorus.viewsToTearDown).toEqual([this.view1, this.view2]);
            spyOn(this.view1, "teardown");
            spyOn(this.view2, "teardown");
            this.chorus._navigated();
        });

        it("tears down all global views", function() {
            expect(this.view1.teardown).toHaveBeenCalled();
            expect(this.view2.teardown).toHaveBeenCalled();
            expect(this.chorus.viewsToTearDown.length).toBe(0);
        });
    });

    describe("unregisterView", function() {
        beforeEach(function() {
            this.chorus.initialize();
            this.view1 = new chorus.views.Base();
            this.view2 = new chorus.views.Base();
            this.view3 = new chorus.views.Base();
            this.chorus.viewsToTearDown.push(this.view1);
            this.chorus.viewsToTearDown.push(this.view2);
            expect(this.chorus.viewsToTearDown).toEqual([this.view1, this.view2]);
        });

        it("removes the view from viewsToTearDown if applicable", function() {
            this.chorus.unregisterView(this.view1);
            expect(this.chorus.viewsToTearDown).toEqual([this.view2]);
        });

        it("does nothing if the view is not in viewsToTearDown", function() {
            this.chorus.unregisterView(this.view3);
            expect(this.chorus.viewsToTearDown).toEqual([this.view1, this.view2]);
        });
    });

    describe("#toast", function() {
        it("> accepts a translation string", function() {
            chorus.toast("test.mouse");
            expect(Messenger().post).toHaveBeenCalledWith({message: t("test.mouse")});
        });

        it("> accepts a translation string with arguments", function() {
            chorus.toast("test.with_param", {param: "Dennis"});
            expect(Messenger().post).toHaveBeenCalledWith({message: "Dennis says hi"});
        });

        it("> accepts toastOpts in the options hash", function() {
            chorus.toast("test.with_param", { param: "Nobody", toastOpts: {hideAfter: 0, foo: "bar"}});
            expect(Messenger().post).toHaveBeenCalledWith({message: "Nobody says hi", hideAfter: 0, foo: "bar"});
        });

        it("> accepts a message and does not translate it with flag skipTranslation", function() {
            chorus.toast("No translation for me", { skipTranslation: true });
            expect(Messenger().post).toHaveBeenCalledWith({message: "No translation for me"});
        });
    });

    describe("fileDownload", function() {
        beforeEach(function() {
            spyOn($, 'fileDownload');
            spyOn($.fn, 'attr').andReturn('csrf-token');
        });

        it("delegate to $.fileDownload with the csrf token", function() {
            chorus.fileDownload('/route', {data: {key: 'value'}, some: 'property'});
            expect($.fileDownload).toHaveBeenCalledWith('/route', {
                data: {
                    authenticity_token: 'csrf-token',
                    key: 'value'
                },
                some: 'property'
            });
        });
    });

    describe("#placeholder", function() {
        it("wraps jquery.placeholder", function() {
            spyOn($.fn, 'placeholder');
            var input = $("<input/>");
            input.placeholder();
            expect($.fn.placeholder).toHaveBeenCalledOn(input);
        });
    });

    describe("#styleSelect", function() {
        var $selectMenu1, $selectMenu2;
        beforeEach(function() {
            $selectMenu1 = $("<select></select>").append("<option title='first'>1</option><option title='second'>2</option>");
            $selectMenu2 = $("<select></select>").append("<option title='1st'>One</option><option title='2nd'>Two</option>");

            $("#jasmine_content").append($selectMenu1);
            $("#jasmine_content").append($selectMenu2);

            chorus.styleSelect($selectMenu1);
            chorus.styleSelect($selectMenu2);
        });

        it("puts a title= attribute on the link-element", function() {
            var $linkToMenu1 = $selectMenu1.next().find("a.ui-button");
            expect($linkToMenu1).toContainText("1");
            expect($linkToMenu1.attr("title")).toContainText("first");
        });

        it("updates the title= attribute on link-element when a selection has been made", function() {
            $selectMenu1.find("option:selected").attr("title", "cheat");
            $selectMenu1.trigger("change");

            expect($selectMenu1.next().find("a.ui-button").attr("title")).toContainText("cheat");
        });

        it("carries over the titles from the correct selectMenu", function() {
            var id1 = $selectMenu1.next().find("a.ui-button").attr("aria-owns");
            var id2 = $selectMenu2.next().find("a.ui-button").attr("aria-owns");
            $selectMenu1.next().find("a.ui-button").click();
            $selectMenu2.next().find("a.ui-button").click();

            expect(id1).toBeDefined();
            expect(id2).toBeDefined();
            expect(id1).not.toBe(id2);

            var $uiMenu1 = $("#"+id1);
            var $uiMenu2 = $("#"+id2);

            expect($uiMenu1.find("li").eq(0)).toContainText("1");
            expect($uiMenu1.find("li").eq(1)).toContainText("2");

            expect($uiMenu1.find("li").eq(0)).toHaveAttr("title", "first");
            expect($uiMenu1.find("li").eq(1)).toHaveAttr("title", "second");

            expect($uiMenu2.find("li").eq(0)).toContainText("One");
            expect($uiMenu2.find("li").eq(1)).toContainText("Two");

            expect($uiMenu2.find("li").eq(0)).toHaveAttr("title", "1st");
            expect($uiMenu2.find("li").eq(1)).toHaveAttr("title", "2nd");
        });
    });

    describe("#datePicker(element)", function() {
        beforeEach(function() {
            spyOn(datePickerController, 'createDatePicker');
            this.input1 = $("<input></input");
            this.input2 = $("<input></input");
            this.input3 = $("<input></input");
            chorus.datePicker({
                "%d": this.input1,
                "%m": this.input2,
                "%Y": this.input3
            });

            this.id1 = this.input1.attr("id");
            this.id2 = this.input2.attr("id");
            this.id3 = this.input3.attr("id");
        });

        it("gives the elements unique ids", function() {
            expect(this.id1).toBeA("string");
            expect(this.id2).toBeA("string");
            expect(this.id3).toBeA("string");
        });

        it("calls datePickerController with the right unique ids and format strings", function() {
            expect(datePickerController.createDatePicker).toHaveBeenCalled();

            var datePickerParams = datePickerController.createDatePicker.lastCall().args[0];
            expect(datePickerParams.formElements[this.id1]).toBe("%d");
            expect(datePickerParams.formElements[this.id2]).toBe("%m");
            expect(datePickerParams.formElements[this.id3]).toBe("%Y");
            expect(datePickerParams.dragDisabled).toBeTruthy();
        });

        describe("disableBeforeToday", function() {
            beforeEach(function() {
                this.useFakeTimers(new Date(2000, 11, 25).getTime(), "Date");
            });

            it("disables the right dates when disableBeforeToday is passed in", function() {
                spyOn(datePickerController, "setDisabledDates");
                chorus.datePicker({
                    "%d": this.input1,
                    "%m": this.input2,
                    "%Y": this.input3
                }, {disableBeforeToday: true});

                expect(datePickerController.setDisabledDates).toHaveBeenCalledWith(this.input1.attr("id"), {"00000101": "20001224"});
            });
        });
    });

    describe("resizing the window", function() {
        beforeEach(function() {
            this.chorus.bindGlobalCallbacks();

            this.page1 = new chorus.pages.Base();
            this.page2 = new chorus.pages.Base();

            this.chorus.page = new chorus.pages.Base();

            spyOnEvent(this.page1, "resized");
            spyOnEvent(this.page2, "resized");
            spyOnEvent(this.chorus.page, "resized");
            $(window).resize();
        });

        it("should not trigger resized on the anonymous pages, because those pages aren't the active page", function() {
            expect("resized").not.toHaveBeenTriggeredOn(this.page1);
            expect("resized").not.toHaveBeenTriggeredOn(this.page2);
        });

        it("should trigger resized on chorus.page", function() {
            expect("resized").toHaveBeenTriggeredOn(this.chorus.page);
        });
    });

    describe("#search", function() {
        beforeEach(function() {
            this.input1 = $("<input></input>");
            this.input2 = $("<input></input>");
            this.list = $("<ul></ul>");
            this.container = $("<div></div>")
                .append(this.input1)
                .append(this.input2);

            _.each(["joseph", "max", "nitin"], function(name) {
                $("<li></li>").append('<div class="name">' + name + '</div>').append('<div>add</div>').appendTo(this.list);
            }, this);

        });

        it("adds the 'chorus_search' class to the input", function() {
            chorus.search({ input: this.input1, list: this.list });
            expect(this.input1).toHaveClass("chorus_search");
        });

        context("with an onTextChange function supplied", function() {
            beforeEach(function() {
                this.onTextChange = jasmine.createSpy("onTextChange");
                chorus.search({ input: this.input1, onTextChange: this.onTextChange});
            });

            it("should call the onTextChange function when the text changes", function() {
                expect(this.onTextChange).not.toHaveBeenCalled();
                this.input1.val("otherText").trigger("keyup");
                expect(this.onTextChange).toHaveBeenCalled();
            });
        });

        context("with the default onTextChange and a supplied eventName", function() {
            beforeEach(function() {
                spyOn(chorus.PageEvents, "trigger");
                chorus.search({ input: this.input1, list: this.list, eventName: "database:search"});
            });

            it("should trigger the event", function() {
                this.input1.val("otherText").trigger("keyup");
                expect(chorus.PageEvents.trigger).toHaveBeenCalledWith("database:search");
            });
        });

        context("> when called multiple times on the same element", function() {
            beforeEach(function() {
                chorus.search({ input: this.input1, list: this.list});
                chorus.search({ input: this.input1, list: this.list});
            });

            it("> doesn't change the dom more than once", function() {
                var wrapper = this.container.find(".chorus_search_container");
                expect(wrapper).not.toContain(".chorus_search_container");
            });
        });

        context("with a selector", function() {
            beforeEach(function() {
                chorus.search({ input: this.input1, list: this.list, selector: ".name" });
            });

            describe("when text is entered in the search input", function() {
                it("hides elements in the list that do not contain the search string", function() {
                    this.input1.val("nit").trigger("textchange");

                    expect(this.list.find("li").eq(0)).toHaveClass("hidden");
                    expect(this.list.find("li").eq(1)).toHaveClass("hidden");
                    expect(this.list.find("li").eq(2)).not.toHaveClass("hidden");
                });

                it("only searches text within the selector", function() {
                    this.input1.val("add").trigger("textchange");

                    expect(this.list.find("li").eq(0)).toHaveClass("hidden");
                    expect(this.list.find("li").eq(1)).toHaveClass("hidden");
                    expect(this.list.find("li").eq(2)).toHaveClass("hidden");
                });
            });
        });

        context("without a selector", function() {
            beforeEach(function() {
                chorus.search({ input: this.input1, list: this.list});
            });

            describe("when text is entered in the search input", function() {
                it("hides elements in the list that do not contain the search string", function() {
                    this.input1.val("nit").trigger("textchange");

                    expect(this.list.find("li").eq(0)).toHaveClass("hidden");
                    expect(this.list.find("li").eq(1)).toHaveClass("hidden");
                    expect(this.list.find("li").eq(2)).not.toHaveClass("hidden");
                });

            });
        });

        describe("when there is more than one element in the 'input' jquery array", function() {
            beforeEach(function() {
                chorus.search({ input: this.container.find("input"), list: this.list});
                this.wrapperDivs = this.container.find(".chorus_search_container");
            });

            it("uses the text from the most recently changed input to filter the list", function() {
                this.input1.val("ma").trigger("textchange");

                expect(this.list.find("li").eq(0)).toHaveClass("hidden");
                expect(this.list.find("li").eq(1)).not.toHaveClass("hidden");
                expect(this.list.find("li").eq(2)).toHaveClass("hidden");

                this.input2.val("jo").trigger("textchange");

                expect(this.list.find("li").eq(0)).not.toHaveClass("hidden");
                expect(this.list.find("li").eq(1)).toHaveClass("hidden");
                expect(this.list.find("li").eq(2)).toHaveClass("hidden");

                this.input1.val("nit").trigger("textchange");

                expect(this.list.find("li").eq(0)).toHaveClass("hidden");
                expect(this.list.find("li").eq(1)).toHaveClass("hidden");
                expect(this.list.find("li").eq(2)).not.toHaveClass("hidden");
            });

            it("adds a clear button to each input", function() {
                expect(this.wrapperDivs.length).toBe(2);
                expect(this.wrapperDivs.eq(0)).toContain(this.input1);
                expect(this.wrapperDivs.eq(1)).toContain(this.input2);
                expect(this.wrapperDivs.eq(0)).toContain(".chorus_search_clear");
                expect(this.wrapperDivs.eq(1)).toContain(".chorus_search_clear");
            });
        });

        describe("callbacks", function() {
            var onFilterSpy, afterFilterSpy;

            beforeEach(function() {
                onFilterSpy = jasmine.createSpy("onFilter").andCallFake(function() {
                    expect(afterFilterSpy.calls.count()).toBe(0);
                });

                afterFilterSpy = jasmine.createSpy("afterFilter").andCallFake(function() {
                    expect(onFilterSpy.calls.count()).toBe(2);
                });

                chorus.search({
                    input: this.input1,
                    list: this.list,
                    onFilter: onFilterSpy,
                    afterFilter: afterFilterSpy
                });
            });

            describe("when text is entered, and items are filtered out", function() {
                beforeEach(function() {
                    this.input1.val("nit").trigger("textchange");
                });

                it("calls the 'onFilter' callback on each item that was filtered out", function() {
                    expect(onFilterSpy.calls.count()).toBe(2);
                    expect(onFilterSpy.nthCall(0).args[0]).toBe(this.list.find("li").eq(0));
                    expect(onFilterSpy.nthCall(1).args[0]).toBe(this.list.find("li").eq(1));
                });

                it("calls the 'afterFilter' callback once, after filtering the items", function() {
                    expect(afterFilterSpy.calls.count()).toBe(1);
                });
            });
        });


    });

    describe("#addSearchFieldModifications", function() {
        beforeEach(function() {
            this.input1 = $("<input></input>");
            this.container = $("<div></div>").append(this.input1);

            chorus.addSearchFieldModifications(this.input1);
            this.clearLink = this.container.find("a.chorus_search_clear");
        });

        it("> adds a little 'x' to the right of the search input", function() {
            this.input1.val("nit").trigger("textchange");
            expect(this.clearLink).toExist();
            expect(this.clearLink.find("span").attr("class")).toBe("fa fa-times search_clear");
        });

        it("> hides the 'x' when the input is blank", function() {
            expect(this.clearLink).toHaveClass("hidden");

            this.input1.val("foo").trigger("textchange");
            expect(this.clearLink).not.toHaveClass("hidden");

            this.input1.val("").trigger("textchange");
            expect(this.clearLink).toHaveClass("hidden");
        });

        describe("when the 'x' is clicked", function() {
            beforeEach(function() {
                this.input1.val("nit").trigger("textchange");
                spyOnEvent(this.input1, 'textchange');
                spyOn($.fn, "blur");
                this.clearLink.click();
            });

            it("clears the search text", function() {
                expect(this.input1.val()).toBe("");
            });

            it("hides the 'x'", function() {
                expect(this.clearLink).toHaveClass("hidden");
            });

            it("triggers a 'textchange' event on the input", function() {
                expect("textchange").toHaveBeenTriggeredOn(this.input1);
            });

            it("blurs the element so the placeholder text reappears", function() {
                expect($.fn.blur).toHaveBeenCalled();
            });
        });
    });

    describe("#requireLogin", function() {
        beforeEach(function() {

            this.chorus.initialize();
            Backbone.history.fragment = "/foo";
            setLoggedInUser({id: "1", username: "iAmNumberOne"}, this.chorus);
        });

        it("deletes the user from the session", function () {
            var user = this.chorus.session.user();
            this.chorus.requireLogin();
            expect(this.chorus.session.user().cid).not.toEqual(user.cid);
        });

        it("tells the session to save the path of the page the user was trying to get to", function() {
            spyOn(this.chorus.session, 'rememberPathBeforeLoggedOut');
            this.chorus.requireLogin();
            expect(this.chorus.session.rememberPathBeforeLoggedOut).toHaveBeenCalled();
        });

        it("navigates to the login page", function() {
            spyOn(this.chorus.router, 'navigate');
            this.chorus.requireLogin();
            expect(this.chorus.router.navigate).toHaveBeenCalledWith("/login");
        });
    });

    describe("#pageParams", function () {
        context("when there are none", function () {
            it("returns an empty object", function () {
                window.location.hash='workspaces/14/quickstart';
                expect(chorus.pageParams()).toEqual({});
            });
        });

    });
});
