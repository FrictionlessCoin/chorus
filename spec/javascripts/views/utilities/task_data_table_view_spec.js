describe("chorus.views.TaskDataTable", function() {
    beforeEach(function() {
        this.task = rspecFixtures.dataPreviewTaskResults({
            columns: [
                { name: "id", typeCategory: "WHOLE_NUMBER" },
                { name: "city", typeCategory: "OTHER" },
                { name: "state", typeCategory: "OTHER" },
                { name: "zip", typeCategory: "OTHER" }
            ],
            rows: [
                [1, "Oakland", "CA", "94612"],
                [2, "Arcata", "CA", "95521"] ,
                [3, "Lafayette", "IN", null]
            ]
        });

        this.view = new chorus.views.TaskDataTable({ model: this.task });
    });

    describe("falsy data", function() {
        beforeEach(function() {
            this.task.get("rows")[0] = [0, false, null];

            this.view.render();
        });

        it("outputs a string 0 for a numeric 0", function() {
            expect(this.view.$(".column:eq(0) div.td:eq(0)").text()).toBe("0");
        });

        it("outputs a string false for a boolean false", function() {
            expect(this.view.$(".column:eq(1) div.td:eq(0)").text()).toBe("false");
        });

        it("outputs an HTML non-breaking space for a null", function() {
            expect(this.view.$(".column:eq(2) div.td:eq(0)").html()).toBe("&nbsp;");
        });
    });

    describe("#render", function() {
        beforeEach(function() {
            stubDefer();
            spyOn($.fn, "jScrollPane").andCallThrough();
            this.view.render();
        });

        it("should enable shuttling", function() {
            expect(this.view.$(".th a.move_to_first").length).not.toBe(0);
        });

        it("renders a column div for every column of the result", function() {
            expect(this.view.$("div.column").length).toBe(4);
        });

        it("renders a column header for each column, with the column's name", function() {
            expect(this.view.$("div.th:eq(0) .name").text()).toBe("id");
            expect(this.view.$("div.th:eq(1) .name").text()).toBe("city");
            expect(this.view.$("div.th:eq(2) .name").text()).toBe("state");
            expect(this.view.$("div.th:eq(3) .name").text()).toBe("zip");
        });

        it("renders a cell for every field", function() {
            expect(this.view.$(".column:eq(0) div.td:eq(0)").text()).toBe("1");
            expect(this.view.$(".column:eq(0) div.td:eq(1)").text()).toBe("2");
            expect(this.view.$(".column:eq(0) div.td:eq(2)").text()).toBe("3");

            expect(this.view.$(".column:eq(1) div.td:eq(0)").text()).toBe("Oakland");
            expect(this.view.$(".column:eq(1) div.td:eq(1)").text()).toBe("Arcata");
            expect(this.view.$(".column:eq(1) div.td:eq(2)").text()).toBe("Lafayette");

            expect(this.view.$(".column:eq(2) div.td:eq(0)").text()).toBe("CA");
            expect(this.view.$(".column:eq(2) div.td:eq(1)").text()).toBe("CA");
            expect(this.view.$(".column:eq(2) div.td:eq(2)").text()).toBe("IN");

            expect(this.view.$(".column:eq(3) div.td:eq(0)").text()).toBe("94612");
            expect(this.view.$(".column:eq(3) div.td:eq(1)").text()).toBe("95521");

            // Empty divs don't render correctly - assert null values become non-breaking spaces.
            expect(this.view.$(".column:eq(3) div.td:eq(2)").html().trim()).toBe("&nbsp;");
        });

        it("adds a data attribute to each column, specifying its type", function() {
            expect(this.view.$(".column:eq(0)").attr("data-type")).toBe("WHOLE_NUMBER");
            expect(this.view.$(".column:eq(1)").attr("data-type")).toBe("OTHER");
        });

        it("sets up custom scrolling", function() {
            expect($.fn.jScrollPane).toHaveBeenCalled();
        })

        context("clicking on the jump to left arrow", function() {
            beforeEach(function() {
                this.view.$(".th:eq(2) a.move_to_first").click();
            });

            it("moves the clicked column to the leftmost position", function() {
                expect(this.view.$("div.th:eq(0) .name").text()).toBe("state");
                expect(this.view.$("div.th:eq(1) .name").text()).toBe("id");
                expect(this.view.$("div.th:eq(2) .name").text()).toBe("city");
                expect(this.view.$("div.th:eq(3) .name").text()).toBe("zip");

                expect(this.view.$(".column:eq(0) div.td:eq(0)").text()).toBe("CA");
                expect(this.view.$(".column:eq(1) div.td:eq(0)").text()).toBe("1");
                expect(this.view.$(".column:eq(2) div.td:eq(0)").text()).toBe("Oakland");
                expect(this.view.$(".column:eq(3) div.td:eq(0)").text()).toBe("94612");
            });

            it("keeps all the columns and headers at the same level", function() {
                expect(this.view.$("div.th:eq(0)").parent().children('.th').length).toBe(4);
                expect(this.view.$(".column:eq(0)").parent().children('.column').length).toBe(4);
            })
        });

        describe("enable and disable shuttling", function() {
            context("when shuttling is enabled", function() {
                beforeEach(function() {
                    this.view.options.shuttle = true;
                    this.view.render();
                });

                it("should enable shuttling", function() {
                    expect(this.view.$(".th a.move_to_first").length).not.toBe(0);
                });
            });

            context("when shuttling is disabled", function() {
                beforeEach(function() {
                    this.view.options.shuttle = false;
                    this.view.render();
                });

                it("should disable shuttling", function() {
                    expect(this.view.$(".th a.move_to_first").length).toBe(0);
                });
            });
        });
    });
});
