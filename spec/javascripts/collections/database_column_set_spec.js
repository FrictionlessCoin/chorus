describe("chorus.collections.DatabaseColumnSet", function() {
    describe("database table column", function() {
        beforeEach(function() {
            var table = newFixtures.workspaceDataset.sandboxTable({
                instance: {
                    id: '2',
                    name: 'instance2'
                },
                databaseName: 'db1',
                schema: {name: 'schema1'},
                objectName: 'table1',
                id: '1'
            });
            this.columns = table.columns();
        });

        it("has the correct urlTemplate", function() {
            expect(this.columns.url()).toContain("/datasets/1/columns");
        })

        describe("when a model is added", function() {
            it("sets the dataset on the added column", function() {
                this.columns.add(fixtures.databaseColumn());
                expect(this.columns.models[0].dataset).toBe(this.columns.dataset);
            })
        });
    });

    describe("database view column", function() {
        beforeEach(function() {
            var view = newFixtures.workspaceDataset.sandboxView({
                instance: {
                    id: '2',
                    name: 'instance2'
                },
                databaseName: 'db1',
                schema: {name: 'schema1'},
                objectName: 'view1',
                id: '3'
            })
            this.columns = view.columns();
        });

        it("has the correct urlTemplate", function() {
            expect(this.columns.url()).toContain("/datasets/3/columns");
        })

        context("when the names need to be url encoded", function() {
            beforeEach(function() {
                var table = newFixtures.workspaceDataset.sandboxView({
                    instance: {
                        id: '2',
                        name: '%foo%'
                    },
                    databaseName: 'b/a/r',
                    schema: {name: 'baz'},
                    objectName: '!!!',
                    id: '4'
                });
                this.columns = table.columns();
            });

            it("should url encode the appropriate entities", function() {
                expect(this.columns.url()).toContain("/datasets/4/columns");
            });
        });

    });

    describe("database chorus view column", function() {
        beforeEach(function() {
            var chorusView = newFixtures.workspaceDataset.chorusView({
                workspace: {
                    id: '10'
                },
                id: '5'
            })
            this.columns = chorusView.columns();
        })

        it("has the correct urlTemplate", function() {
            expect(this.columns.url()).toMatchUrl('/datasets/5/columns', {paramsToIgnore: ['page', 'rows']});
        })
    })

    describe("#urlParams", function() {
        context("when type attribute is meta", function() {
            beforeEach(function() {
                this.columns = newFixtures.workspaceDataset.sandboxView().columns({type: "meta"});
            });

            it("should include the 'type' parameter in the url", function() {
                expect(this.columns.urlParams().type).toBe("meta");
            });
        });

        context("when type attribute is unspecified", function() {
            beforeEach(function() {
                this.columns = newFixtures.workspaceDataset.sandboxView().columns();
            });

            it("should not include the 'type' parameter in the url", function() {
                expect(this.columns.urlParams().type).toBeFalsy();
            });
        });
    });

    describe("sorting", function() {
        context("without dataset", function() {
            beforeEach(function() {
                this.columns = new chorus.collections.DatabaseColumnSet();
                this.firstColumn = fixtures.databaseColumn({ordinalPosition: 1});
                this.secondColumn = fixtures.databaseColumn({ordinalPosition: 2});
                this.columns.add(this.secondColumn);
                this.columns.add(this.firstColumn);
            })
            it("should be ordered by ordinalPosition", function() {
                expect(this.columns.models).toEqual([this.firstColumn, this.secondColumn]);
            });
        });

        context("with multiple dataset", function() {
            beforeEach(function() {
                this.dataset1 = newFixtures.workspaceDataset.sandboxTable();
                this.dataset1.datasetNumber = 1;
                this.dataset1Columns = this.dataset1.columns();
                this.dataset1Columns.reset([fixtures.databaseColumn({ordinalPosition: 1}), fixtures.databaseColumn({ordinalPosition: 2}), fixtures.databaseColumn({ordinalPosition: 3})]);
                this.dataset2 = newFixtures.workspaceDataset.sandboxTable();
                this.dataset2.datasetNumber = 2;
                this.dataset2Columns = this.dataset2.columns()
                this.dataset2Columns.reset([fixtures.databaseColumn({ordinalPosition: 1}), fixtures.databaseColumn({ordinalPosition: 2})]);

                this.columns = new chorus.collections.DatabaseColumnSet();
                this.columns.add(this.dataset1Columns.models);
                this.columns.add(this.dataset2Columns.models);
            });

            it("sorts first by datasetNumber, then by ordinalPosition", function() {
                expect(_.pluck(this.columns.models, 'cid')).toEqual(_.pluck((this.dataset1Columns.models.concat(this.dataset2Columns.models)), 'cid'));
            });
        });
    });
});
