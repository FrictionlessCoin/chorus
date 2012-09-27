describe("chorus.Mixins.Fetching", function() {
    beforeEach(function() {
        this.resource = new chorus.models.Base();
        this.resource.urlTemplate = "foo";
    });

    describe("fetchAllIfNotLoaded", function() {
        beforeEach(function() {
            this.collection = new chorus.collections.Base();
            this.collection.urlTemplate = "bar";
        });

        context("when the collection is not loaded", function() {
            beforeEach(function() {
                this.collection.fetchAllIfNotLoaded();
            });
            context("when there is less than a single page of results", function() {
                beforeEach(function() {
                    this.server.completeFetchAllFor(this.collection, undefined, undefined, {page: 1, total: 1, records: 1});
                });

                it("is done loading", function() {
                    expect(this.collection.loaded).toBeTruthy();
                    expect(this.server.requests.length).toBe(1);
                });
            });
            context("when there is more than a single page of results", function() {
                beforeEach(function() {
                    this.server.completeFetchAllFor(this.collection, undefined, undefined, {page: 1, total: 2, records: 4});
                });

                it("it makes another request", function() {
                    expect(this.collection.loaded).toBeFalsy();
                    expect(this.server.lastFetchAllFor(this.collection, {page: 2})).toBeDefined();
                });

                it("finishes once there are more pages", function() {
                    this.server.completeFetchAllFor(this.collection, undefined, {page: 2}, {page: 2, total: 2, records: 4});
                    expect(this.collection.loaded).toBeTruthy();
                    expect(this.server.lastFetchAllFor(this.collection, {page: 3})).toBeUndefined();
                });
            });
        });

        context("when the collection is loaded", function() {
            beforeEach(function() {
                this.collection.loaded = true;
            });
            context("and there are no more results to fetch", function() {
                beforeEach(function() {
                    this.collection.fetch();
                    this.server.completeFetchFor(this.collection, [{}, {}], undefined, {page: 1, total: 1, records: 2});
                    this.server.reset();
                    this.collection.fetchAllIfNotLoaded();
                });

                it("is done loading", function() {
                    expect(this.collection.loaded).toBeTruthy();
                    expect(this.server.requests.length).toBe(0);
                });
            });
            context("and there are more results to fetch", function() {
                beforeEach(function() {
                    this.collection.fetch();
                    this.server.completeFetchFor(this.collection, [{}, {}], undefined, {page: 1, total: 2, records: 4});
                    this.server.reset();
                    this.collection.fetchAllIfNotLoaded();
                });

                it("it makes another request", function() {
                    expect(this.collection.loaded).toBeFalsy();
                    expect(this.server.lastFetchAllFor(this.collection, {page: 1})).toBeDefined();
                });

                it("finishes once there are more pages", function() {
                    this.server.completeFetchAllFor(this.collection, [{}, {}], {page: 1}, {page: 1, total: 2, records: 4});
                    expect(this.collection.loaded).toBeFalsy();

                    this.server.completeFetchAllFor(this.collection, [{}, {}], {page: 2}, {page: 2, total: 2, records: 4});
                    expect(this.collection.loaded).toBeTruthy();
                    expect(this.server.lastFetchAllFor(this.collection, {page: 3})).toBeUndefined();
                });
            });
        });
    });

    describe("fetchIfNotLoaded", function() {
        beforeEach(function() {
            spyOn(this.resource, 'fetch').andCallThrough();
        });

        context("when not loaded or fetching", function() {
            it("starts a fetch", function() {
                this.resource.fetchIfNotLoaded();
                expect(this.resource.fetch).toHaveBeenCalled();
            });
        });

        context("when loaded", function() {
            beforeEach(function() {
                this.resource.loaded = true;
            });

            it("it won't start fetching again", function() {
                this.resource.fetchIfNotLoaded();
                expect(this.resource.fetch).not.toHaveBeenCalled();
            });
        });

        context("when fetching", function() {
            beforeEach(function() {
                this.resource.fetch();
            });

            it("it won't start a second fetch", function() {
                this.resource.fetch.reset();
                this.resource.fetchIfNotLoaded();
                expect(this.resource.fetch).not.toHaveBeenCalled();
            });
        });

        context("after fetch completes", function() {
            beforeEach(function() {
                this.resource.fetch();
                this.server.completeFetchFor(this.resource);
            });

            context("if the model is declared unloaded", function() {
                beforeEach(function() {
                    this.resource.loaded = false;
                    this.resource.fetch.reset();
                });

                it('will fetch again', function() {
                    this.resource.fetchIfNotLoaded();
                    expect(this.resource.fetch).toHaveBeenCalled();
                });
            });
        });

        context("after the fetch fails", function() {
            beforeEach(function() {
                this.resource.fetch();
                this.server.lastFetchFor(this.resource).failUnprocessableEntity();
                this.resource.fetch.reset();
            });

            it('will fetch again', function() {
                this.resource.fetchIfNotLoaded();
                expect(this.resource.fetch).toHaveBeenCalled();
            });
        });

        context("after the fetch errors", function() {
            beforeEach(function() {
                this.resource.fetch();
                this.server.lastFetchFor(this.resource).error();
                this.resource.fetch.reset();
            });

            it('will fetch again', function() {
                this.resource.fetchIfNotLoaded();
                expect(this.resource.fetch).toHaveBeenCalled();
            });
        });

        context("fetching with options", function() {
            beforeEach(function() {
                this.resource.fetchIfNotLoaded({per_page: 10});
            });
            it("should pass options to fetch", function() {
                expect(this.resource.fetch.mostRecentCall.args[0].per_page).toBe(10);
            });
        });
    });

    describe("#parse", function() {
        it("returns the enclosed resource", function() {
            expect(this.resource.parse({
                status: "ok",
                foo: "bar",
                response: { hi_there: { youre_cool: true } }
            }, {
                status: 200
            })).toEqual({
                    hiThere: { youreCool: true }
                });
        });
    });

    describe("#camelizeKeys", function() {
        var params;

        beforeEach(function() {
            params = {
                ownerId: 1,
                two_words: {
                    nested_attribute: 2,
                    double_nested: [
                        {other_thing: 3},
                        {other_other_thing: 4}
                    ]
                }
            };
        });

        it("recursively converts the keys of the given hash to camel case", function() {
            expect(this.resource.camelizeKeys(params)).toEqual({
                ownerId: 1,
                twoWords: {
                    nestedAttribute: 2,
                    doubleNested: [
                        {otherThing: 3},
                        {otherOtherThing: 4}
                    ]
                }
            });
        });

        it("knows the difference between arrays and objects", function() {
            var arrayProperty = this.resource.camelizeKeys(params).twoWords.doubleNested;
            expect(_.isArray(arrayProperty)).toBeTruthy();
        });
    });

    describe("#underscoreKeys", function() {
        var params;

        beforeEach(function() {
            params = {
                ownerId: 1,
                twoWords: {
                    nestedAttribute: 2,
                    doubleNested: [
                        {otherThing: 3},
                        {otherOtherThing: 4}
                    ]
                }
            };
        });

        it("recursively converts the keys of the given hash to snake case", function() {

            expect(this.resource.underscoreKeys(params)).toEqual({
                owner_id: 1,
                two_words: {
                    nested_attribute: 2,
                    double_nested: [
                        {other_thing: 3},
                        {other_other_thing: 4}
                    ]
                }
            });
        });

        it(" knows the difference between arrays and objects", function() {
            var arrayProperty = this.resource.underscoreKeys(params).two_words.double_nested;
            expect(_.isArray(arrayProperty)).toBeTruthy();
        });
    });

    describe("#parseErrors", function() {
        beforeEach(function() {
            this.things = [
                {hi: "there"},
                {go: "away"}
            ];
        });

        context("when the response is '401 unauthorized'", function() {
            beforeEach(function() {
                spyOnEvent(chorus.session, "needsLogin");

                this.data = {
                    response: { foo: "bar" },
                    errors: { record: "bad" }
                };
            });

            itHandlesFailure();

            it("triggers the 'needsLogin' event on the session", function() {
                this.resource.respondToErrors(401);
                expect("needsLogin").toHaveBeenTriggeredOn(chorus.session);
            });
        });


        context("when the response is '403 forbidden'", function() {
            beforeEach(function() {
                spyOn(this.resource, "trigger");
                this.data = {
                    response: { instanceId: 1 },
                    errors: { record: "no" }
                };
            });

            itHandlesFailure();

            it("triggers resourceForbidden on the resource", function() {
                this.resource.respondToErrors(403);
                expect(this.resource.trigger).toHaveBeenCalledWith("resourceForbidden");
            });
        });

        context("when the response is '404 not found'", function() {
            beforeEach(function() {
                spyOn(this.resource, "trigger");
                this.data = {};
            });

            itHandlesFailure();

            it("triggers resourceNotFound on the resource", function() {
                this.resource.respondToErrors(404);
                expect(this.resource.trigger).toHaveBeenCalledWith("resourceNotFound");
            });
        });

        context("when the response is '422 unprocessable entity'", function() {
            beforeEach(function() {
                spyOn(this.resource, "trigger");
                this.data = {};
            });

            itHandlesFailure();

            it("triggers unprocessableEntity on the resource", function() {
                this.resource.respondToErrors(422);
                expect(this.resource.trigger).toHaveBeenCalledWith("unprocessableEntity");
            });
        });

        context("when the response is any other error", function() {
            beforeEach(function() {
                spyOn(chorus, "toast");
                this.data = {};
            });

            itHandlesFailure();

            it("shows a toast message", function() {
                this.resource.respondToErrors(500);
                expect(chorus.toast).toHaveBeenCalledWith("server_error");
            });
        });

        function itHandlesFailure() {
            it("does not set loaded", function() {
                this.resource.parseErrors(this.data);
                expect(this.resource.loaded).toBeFalsy();
            });

            it("stores the errors as the resource's 'serverErrors'", function() {
                this.resource.parseErrors(this.data);
                expect(this.resource.serverErrors).toBe(this.data.errors);
            });

            it("stores the returned response as the resource's errorData", function() {
                this.resource.parseErrors(this.data);
                expect(this.resource.errorData).toEqual(this.data.response);
            });
        }
    });

    describe("#fetch", function() {
        beforeEach(function() {
            this.errorSpy = jasmine.createSpy("error");
            this.successSpy = jasmine.createSpy("success");
            this.fetchFailedSpy = jasmine.createSpy("fetchFailed");
            this.loadedSpy = jasmine.createSpy("loaded");

            this.resource.bind("fetchFailed", this.fetchFailedSpy);
            this.resource.bind("loaded", this.loadedSpy);

            this.resource.fetch({
                success: this.successSpy,
                error: this.errorSpy
            });
        });

        context("when there is a server error", function() {
            it("triggers the 'fetchFailed' event on the resource", function() {
                this.server.lastFetch().failUnprocessableEntity();
                expect(this.fetchFailedSpy).toHaveBeenCalled();
                expect(this.fetchFailedSpy.mostRecentCall.args[0]).toBe(this.resource);
            });
        });

        context("when the response is '403 forbidden'", function() {
            it("does not trigger 'loaded", function() {
                this.server.lastFetch().failForbidden({custom: "error"});
                expect(this.loadedSpy).not.toHaveBeenCalled();
            });

            it("fills serverErrors from the errors key", function() {
                this.server.lastFetch().failForbidden({custom: "error"});
                expect(this.resource.serverErrors).toEqual({custom: "error"});
            });

            it("calls the 'error' callback if one is provided", function() {
                this.server.lastFetch().failForbidden({custom: "error"});
                expect(this.errorSpy).toHaveBeenCalled();
            });

            it("triggers the 'fetchFailed' event on the resource after populating the data", function() {
                var resource = this.resource;
                this.fetchFailedSpy.andCallFake(function() {
                    expect(resource.serverErrors).toEqual({custom: "error"});
                });

                this.server.lastFetch().failForbidden({custom: "error"});

                expect(this.fetchFailedSpy).toHaveBeenCalled();
                expect(this.fetchFailedSpy.mostRecentCall.args[0]).toBe(this.resource);
            });
        });

        context("when the fetch succeeds", function() {
            beforeEach(function() {
                this.server.lastFetch().succeed();
            });

            it("triggers the 'loaded' event on the resource", function() {
                expect(this.loadedSpy).toHaveBeenCalled();
            });

            it("calls the 'success' callback if one is provided", function() {
                expect(this.successSpy).toHaveBeenCalled();
            });
        });

        context("when there is an error with a single space in the response text", function() {
            beforeEach(function() {
                this.fetchFailedSpy.reset();
                this.server.lastFetch().respond(401, {'Content-Type': 'application/json'}, " ");
            });

            it("does not crash", function() {
                expect(this.fetchFailedSpy).toHaveBeenCalled();
            });
        });
    });
});
