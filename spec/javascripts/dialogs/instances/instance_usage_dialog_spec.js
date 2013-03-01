describe("chorus.dialogs.InstanceUsage", function() {
    beforeEach(function() {
        this.instance = rspecFixtures.gpdbDataSource({
            name: "pasta",
            host: "greenplum",
            port: "8555",
            description: "it is a food name"
        });
        this.dialog = new chorus.dialogs.InstanceUsage({ instance: this.instance, model: this.instance });
    });

    it("fetches the usage", function() {
        expect(this.dialog.usage).toHaveBeenFetched();
    });

    describe("#render", function() {
        beforeEach(function() {
            this.dialog.render();
            $('#jasmine_content').append(this.dialog.el);
        });

        it("has the right title", function() {
            expect(this.dialog.title).toMatchTranslation("instances.usage.title");
        });

        context("when the usage and config have been fetched", function() {
            beforeEach(function(){
                this.server.completeFetchFor(this.instance.usage(), rspecFixtures.instanceDetails());
                this.workspaces = this.dialog.usage.get("workspaces");
            });

            it("displays the estimated total usage", function() {
                expect(this.dialog.$(".total_usage").text().trim()).toMatchTranslation("instances.usage.total", {size: '286 MB'});
            });

            it("renders a li for each workspace", function() {
                expect(this.dialog.$("li").length).toBe(this.workspaces.length);
            });

            it("renders the workspace_small.png image for each workspace", function() {
                expect(this.dialog.$("li img[src='/images/workspaces/workspace_small.png']").length).toBe(this.workspaces.length);
            });

            it("displays a link to each workspace", function() {
                expect(this.dialog.$("li a.workspace_link").length).toBe(this.workspaces.length);
            });

            it("sets the width of the 'used' bar to be the percentage of the workspace size vs the recommended size", function() {
                var zipped = _.zip(this.dialog.$("li"), this.workspaces);
                _.each(zipped, function(z) {
                    var el = $(z[0]);
                    var workspace = z[1];
                    var actualPercentage = el.find(".used").width() / el.find(".usage_bar").width();
                    expect(actualPercentage).toBeCloseTo(workspace.percentageUsed/100, 1);
                });
            });

            it("displays the size of each workspace", function() {
                var zipped = _.zip(this.dialog.$("li"), this.workspaces);
                _.each(zipped, function(z) {
                    var el = $(z[0]);
                    var workspace = z[1];
                    expect(el.find('.size_text')).toContainText("95 MB");
                });
            });

            it("displays the 'location'", function() {
                expect(this.dialog.$("li:eq(0) .location .value").text().trim()).
                    toBe(this.workspaces[0].databaseName + "/" + this.workspaces[0].schemaName);
            });

            it("displays the owner", function() {
                expect(this.dialog.$("li:eq(0) .owner .value").text().trim()).
                    toBe(this.workspaces[0].ownerFullName);
            });

            context('when the data source is offline', function() {
                beforeEach(function() {
                    this.instance.set("state", "offline");
                    this.dialog.render();
                });

                it("displays the total usage as offline", function() {
                    expect(this.dialog.$(".total_usage")).toContainTranslation("instances.usage.offline");
                });

                it("sets the size text of the workspaces to be 'Offline'", function() {
                    this.dialog.$("li").each(function() {
                        expect($(this).find(".size_text")).toContainTranslation('instances.usage.offline');
                    });
                });

                it("sets the width of the usage bar to be near zero", function() {
                    var zipped = _.zip(this.dialog.$("li"), this.workspaces);
                    _.each(zipped, function(z) {
                        var el = $(z[0]);
                        var workspace = z[1];
                        expect(el.find(".used").width()).toBeLessThan(3);
                    });
                });
            });
        });
    });
});
