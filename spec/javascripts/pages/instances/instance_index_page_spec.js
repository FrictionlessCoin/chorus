describe("chorus.pages.InstanceIndexPage", function() {
    beforeEach(function() {
        this.page = new chorus.pages.InstanceIndexPage();
        this.gpdbInstanceSet = new chorus.collections.GpdbInstanceSet();
        this.hadoopInstanceSet = new chorus.collections.HadoopInstanceSet();
        this.gnipInstanceSet = new chorus.collections.GnipInstanceSet();
    });

    describe("#initialize", function() {
        it("has a helpId", function() {
            expect(this.page.helpId).toBe("instances");
        });

        it("fetches all registered gpdb instances", function() {
            expect(this.gpdbInstanceSet).toHaveBeenFetched();
        });

        it("fetches all registered hadoop instances", function() {
            expect(this.hadoopInstanceSet).toHaveBeenFetched();
        });

        it("fetches all registered gnip instances", function() {
            expect(this.gnipInstanceSet).toHaveBeenFetched();
        });

        it("passes the gpdb and hadoop instances to the content details view", function() {
            var contentDetails = this.page.mainContent.contentDetails;
            expect(contentDetails.options.hadoopInstances).toBeA(chorus.collections.HadoopInstanceSet);
            expect(contentDetails.options.gpdbInstances).toBeA(chorus.collections.GpdbInstanceSet);
            expect(contentDetails.options.gnipInstances).toBeA(chorus.collections.GnipInstanceSet);
        });

        it("passes the gpdb, hadoop and gnip instances to the list view", function() {
            var list = this.page.mainContent.content;
            expect(list.options.hadoopInstances).toBeA(chorus.collections.HadoopInstanceSet);
            expect(list.options.gpdbInstances).toBeA(chorus.collections.GpdbInstanceSet);
            expect(list.options.gnipInstances).toBeA(chorus.collections.GnipInstanceSet);
        });
    });

    describe("when the instances are fetched", function() {
        beforeEach(function() {
            this.server.completeFetchAllFor(this.gpdbInstanceSet, [
                rspecFixtures.gpdbInstance(),
                rspecFixtures.gpdbInstance({id: 123456})
            ]);
        });

        describe("pre-selection", function() {
            it("pre-selects the first item by default", function() {
                this.page.render();
                expect(this.page.mainContent.content.$(".gpdb_instance li.instance:eq(0)")).toHaveClass("selected");
            });
        });

        describe("#render", function() {
            beforeEach(function() {
                chorus.bindModalLaunchingClicks(this.page);
                this.page.render();
            });

            it("launches a new instance dialog", function() {
                var modal = stubModals();
                this.page.mainContent.contentDetails.$("button").click();
                expect(modal.lastModal()).toBeA(chorus.dialogs.InstancesNew);
            });

            it("sets the page model when a 'instance:selected' event is broadcast", function() {
                var instance = rspecFixtures.gpdbInstance();
                expect(this.page.model).not.toBe(instance);
                chorus.PageEvents.broadcast('instance:selected', instance);
                expect(this.page.model).toBe(instance);
            });

            it("displays the loading text", function() {
                expect(this.page.mainContent.contentDetails.$(".loading")).toExist();
            });


            describe("when the hadoopInstances and gnipInstances are fetched", function() {
                beforeEach(function() {
                    this.server.completeFetchAllFor(this.hadoopInstanceSet, [
                        rspecFixtures.hadoopInstance(),
                        rspecFixtures.hadoopInstance({id: 123456})
                    ]);
                    this.server.completeFetchAllFor(this.gnipInstanceSet, [
                        rspecFixtures.gnipInstance(),
                        rspecFixtures.gnipInstance({id: 123456})
                    ]);
                });

                it("doesn't display the loading text and display the correct instances count", function() {
                    expect(this.page.mainContent.contentDetails.$(".loading")).not.toExist();
                    expect(this.page.mainContent.contentDetails.$(".number").text()).toBe("6");
                });
            });
        });
    });
});
