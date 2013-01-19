describe("chorus.views.InstanceList", function() {
    beforeEach(function() {
        this.dataSources = new chorus.collections.DataSourceSet();
        this.hadoopInstances = new chorus.collections.HadoopInstanceSet();
        this.gnipInstances = new chorus.collections.GnipInstanceSet();
        this.dataSources.fetch();
        this.hadoopInstances.fetch();
        this.gnipInstances.fetch();

        this.view = new chorus.views.InstanceList({
            dataSources: this.dataSources,
            hadoopInstances: this.hadoopInstances,
            gnipInstances: this.gnipInstances
        });
    });

    context("without instances", function() {
        describe("#render", function() {
            beforeEach(function() {
                this.view.render();
            });

            it("renders empty text for each instance type", function() {
                expect(this.view.$(".gpdb_instance .no_instances").text().trim()).toMatchTranslation("instances.none");
                expect(this.view.$(".hadoop_instance .no_instances").text().trim()).toMatchTranslation("instances.none");
                expect(this.view.$(".gnip_instance .no_instances").text().trim()).toMatchTranslation("instances.none");
            });
        });
    });

    context("when the instances are fetched", function() {
        beforeEach(function() {
            this.server.completeFetchFor(this.hadoopInstances, [
                rspecFixtures.hadoopInstance({name : "Hadoop9", id: "1"}),
                rspecFixtures.hadoopInstance({name : "hadoop1", id: "2"}),
                rspecFixtures.hadoopInstance({name : "Hadoop10", id: "3"})
            ]);
            this.server.completeFetchFor(this.dataSources, [
                rspecFixtures.gpdbInstance({name : "GP9", id: "1"}),
                rspecFixtures.gpdbInstance({name : "gP1", id: "2"}),
                rspecFixtures.gpdbInstance({name : "GP10", id: "3"})
            ]);
            this.server.completeFetchFor(this.gnipInstances, [
                rspecFixtures.gnipInstance({name : "Gnip1", id:"1"}),
                rspecFixtures.gnipInstance({name : "Gnip2", id: "2"}),
                rspecFixtures.gnipInstance({name : "Gnip3", id: "3"})
            ]);
        });

        it("should display the selectable list styling", function() {
            expect(this.view.$("ul.list")).toHaveClass("selectable");
        });

        it("renders the three instance provider sections", function() {
            expect(this.view.$("div.instance_provider").length).toBe(3);
        });

        it("renders the details section in each instance provider section", function() {
            expect(this.view.$("div.instance_provider .details").length).toBe(3);
        });

        it("renders the gpdb instances in the correct instance div", function() {
            var gpdbItems = this.view.$(".gpdb_instance li.instance");
            expect(gpdbItems.length).toBe(3);
            expect(gpdbItems).toContainText("gP1");
            expect(gpdbItems).toContainText("GP9");
            expect(gpdbItems).toContainText("GP10");
        });

        it("renders the hadoop instances in the correct instance div", function() {
            var hadoopItems = this.view.$(".hadoop_instance li.instance");
            expect(hadoopItems.length).toBe(3);
            expect(hadoopItems).toContainText("hadoop1");
            expect(hadoopItems).toContainText("Hadoop9");
            expect(hadoopItems).toContainText("Hadoop10");
        });

        it("renders the gnip instances in the correct instance div", function() {
            var gnipItems = this.view.$(".gnip_instance li.instance");
            expect(gnipItems.length).toBe(3);
            expect(gnipItems).toContainText("Gnip1");
            expect(gnipItems).toContainText("Gnip2");
            expect(gnipItems).toContainText("Gnip3");
        });

        it("pre-selects the first instance", function() {
            expect(this.view.$("li:first-child")).toHaveClass("selected");
            expect(this.view.$("li.selected").length).toBe(1);
            expect(this.view.$("li.selected")).toContainText('gP1');
        });

        describe("when an instance is destroyed", function() {
            beforeEach(function() {
                this.oldLength = this.dataSources.length;
                var liToSelect = this.view.$("li").eq(2);
                liToSelect.click();
                this.selectedId = liToSelect.data("instanceId");
            });

            context("when it is currently selected", function() {
                beforeEach(function() {
                    this.dataSources.get(this.selectedId).destroy();
                    this.server.lastDestroy().succeed();
                });

                it("selects the next available instance", function() {
                    expect(this.view.$("li:first-child")).toHaveClass("selected");
                    expect(this.view.$("li.selected").length).toBe(1);
                });

                it("renders only the existing items", function() {
                    expect(this.dataSources.models.length).toBe(this.oldLength - 1);
                    expect(this.view.$(".gpdb_instance li.instance").length).toBe(this.oldLength - 1);
                });
            });

            context("when a non-selected instance is destroyed", function() {
                beforeEach(function() {
                    var nonSelectedLi = this.view.$("li").not(".selected").eq(0);
                    var id = nonSelectedLi.data("instanceId");
                    this.dataSources.get(id).destroy();
                    this.server.lastDestroy().succeed();
                });

                it("leaves the same instance selected", function() {
                    expect(this.view.$("li.selected").data("instanceId")).toBe(this.selectedId);
                });
            });
        });

        describe("when an instance is offline", function() {
            beforeEach(function() {
                this.dataSources.reset([
                    rspecFixtures.gpdbInstance({ name: "Greenplum", state: "offline" })
                ]);
                this.view.render();
            });

            it("should display the unknown state icon", function() {
                expect(this.view.$(".gpdb_instance li:eq(0) img.state")).toHaveAttr("src", "/images/instances/yellow.png");
            });

            it("should display the name as a link", function() {
                expect(this.view.$(".gpdb_instance li:eq(0) a.name")).toExist();
                expect(this.view.$(".gpdb_instance li:eq(0) a.name")).toContainText("Greenplum");
            });
        });

        describe("instance:added event", function() {
            beforeEach(function() {
                this.newInstance = rspecFixtures.oracleInstance({id: 31415});
                spyOn(this.view.dataSources, "fetchAll");
                spyOn(this.view.hadoopInstances, "fetchAll");
                spyOn(this.view.gnipInstances, "fetchAll");
                chorus.PageEvents.broadcast("instance:added", this.newInstance);
            });

            it("re-fetches the data source, hadoop and gnip instances", function() {
                expect(this.view.dataSources.fetchAll).toHaveBeenCalled();
                expect(this.view.hadoopInstances.fetchAll).toHaveBeenCalled();
                expect(this.view.gnipInstances.fetchAll).toHaveBeenCalled();
            });

            it("selects the li with a matching id when fetch completes", function() {
                this.dataSources.add(this.newInstance);
                this.view.render(); // re-renders when fetch completes

                expect(this.view.$("li[data-instance-id=31415]")).toHaveClass("selected");
                expect(this.view.$("li.selected").length).toBe(1);
            });
        });

        describe("clicking on a gpdb instance", function() {
            beforeEach(function() {
                this.eventSpy = jasmine.createSpy("instance:selected");
                chorus.PageEvents.subscribe("instance:selected", this.eventSpy);
                this.li2 = this.view.$('li:contains("GP9")');
                this.li3 = this.view.$('li:contains("GP10")');
                this.li2.click();
            });

            it("triggers the instance:selected event", function() {
                expect(this.eventSpy).toHaveBeenCalled();
                var instancePassed = this.eventSpy.mostRecentCall.args[0];
                expect(instancePassed.get("name")).toBe("GP9");
            });

            it("adds the selected class to that item", function() {
                expect(this.li2).toHaveClass("selected");
            });

            describe("when the view re-renders", function() {
                beforeEach(function() {
                    this.view.render();
                });

                it("selects the li that was previously clicked", function() {
                    this.li2 = this.view.$('li:contains("GP9")');
                    expect(this.li2).toHaveClass("selected");
                });
            });

            context("clicking on the same instance again", function() {
                beforeEach(function() {
                    this.li2.click();
                });

                it("does not raise the event again", function() {
                    expect(this.eventSpy.calls.length).toBe(1);
                });
            });

            context("and then clicking on another instance", function() {
                beforeEach(function() {
                    this.li3.click();
                });

                it("removes the selected class from the first li", function() {
                    expect(this.li2).not.toHaveClass("selected");
                });
            });
        });

        describe("clicking on a hadoop instance", function() {
            beforeEach(function() {
                this.eventSpy = jasmine.createSpy();
                chorus.PageEvents.subscribe("instance:selected", this.eventSpy);
                this.liToClick = this.view.$('li:contains("Hadoop10")');
                this.liToClick.click();
            });

            it("triggers the instance:selected event", function() {
                expect(this.eventSpy).toHaveBeenCalled();
                var instancePassed = this.eventSpy.mostRecentCall.args[0];
                expect(instancePassed.get("name")).toBe("Hadoop10");
            });

            it("adds the selected class to that item", function() {
                expect(this.liToClick).toHaveClass("selected");
            });
        });

        describe("clicking on a gnip instance", function() {
            beforeEach(function() {
                this.eventSpy = jasmine.createSpy();
                chorus.PageEvents.subscribe("instance:selected", this.eventSpy);
                this.liToClick = this.view.$('li:contains("Gnip1")');
                this.liToClick.click();
            });

            it("triggers the instance:selected event", function() {
                expect(this.eventSpy).toHaveBeenCalled();
                var instancePassed = this.eventSpy.mostRecentCall.args[0];
                expect(instancePassed.get("name")).toBe("Gnip1");
            });

            it("adds the selected class to that item", function() {
                expect(this.liToClick).toHaveClass("selected");
            });
        });
    });
});
