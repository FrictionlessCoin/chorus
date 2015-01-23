function itHasNoImports(presenter) {
    expect(presenter.lastImport()).toBeFalsy();
    expect(presenter.hasImport()).toBeFalsy();
    expect(presenter.importInProgress()).toBeFalsy();
    expect(presenter.importFailed()).toBeFalsy();
    expect(presenter.inProgressText()).toBeFalsy();
}

function itBehavesLikeAGpdbDataset(presenter) {
    expect(presenter.canExport()).toBeFalsy();
    expect(presenter.displayEntityType()).toEqual("table");
    expect(presenter.noCredentials()).toBeFalsy();
    expect(presenter.noCredentialsWarning()).toBeTruthy();
    expect(presenter.typeString()).toBeTruthy();
    expect(presenter.workspaceId()).toBeFalsy();
    expect(presenter.realWorkspace()).toBeFalsy();
    expect(presenter.importsEnabled()).toBeFalsy();
    expect(presenter.isDeleteable()).toBeFalsy();
    expect(presenter.isChorusView()).toBeFalsy();
    expect(presenter.canAnalyze()).toBe(presenter.resource.canAnalyze());
    expect(presenter.canAssociate()).toBe(presenter.resource.isGreenplum());
    itHasNoImports(presenter);
}

describe("chorus.presenters.DatasetSidebar", function() {
    describe("ellipsize", function() {
        it("ellipsizes a long string", function() {
            expect(chorus.presenters.DatasetSidebar.prototype.ellipsize("Hello my name is very long")).toBe("Hello my nam…");
        });

        it("doesn't ellipsize a short string", function() {
            expect(chorus.presenters.DatasetSidebar.prototype.ellipsize("Hello")).toBe("Hello");
        });

        it("returns an empty string when passed nothing", function() {
            expect(chorus.presenters.DatasetSidebar.prototype.ellipsize(undefined)).toBe("");
        });
    });

    describe("_linkToModel", function() {
        it("returns a link to a model", function() {
            var model = new chorus.models.User({ id: 5, firstName: "Tom", lastName: "Wood" });
            expect(chorus.presenters.DatasetSidebar.prototype._linkToModel(model).toString()).toEqual('<a href="#/users/5" title="Tom Wood">Tom Wood</a>');
        });
    });

    context("with a dataset and no workspace", function() {
        var presenter, resource;
        beforeEach(function() {
            resource = backboneFixtures.dataset();
            presenter = new chorus.presenters.DatasetSidebar(resource);
        });

        it("returns everything", function() {
            itBehavesLikeAGpdbDataset(presenter);
            expect(presenter.deleteMsgKey()).toBeTruthy();
            expect(presenter.deleteTextKey()).toBeTruthy();
        });

        describe("#lastImport", function() {
            context("for a source table", function() {
                beforeEach(function() {
                    this.datasetImport = backboneFixtures.workspaceImportSet().last();
                    this.datasetImport.set({
                        sourceDataset: { id: resource.get('id') },
                        completedStamp: Date.parse("Today - 33 days").toJSONString(),
                        success: true
                    });
                });

                describe("unfinished import", function() {
                    beforeEach(function() {
                        delete this.datasetImport.attributes.completedStamp;
                        this.spy = spyOn(resource, 'lastImport').andReturn(
                            this.datasetImport
                        );
                    });
                    it("has inProgressText and lastImport", function() {
                        expect(presenter.inProgressText()).toMatch("Import into ");
                        expect(presenter.importInProgress()).toBeTruthy();
                        expect(presenter.importFailed()).toBeFalsy();
                        expect(presenter.lastImport()).toMatch("Import started");
                    });

                    it("doesn't display the link in inProgressText when table does not exist yet ", function() {
                        expect(presenter.inProgressText().toString()).toMatchTranslation("import.in_progress", { tableLink: this.datasetImport.destination().name()});
                    });

                    context("when importing to an existing table", function() {
                        beforeEach(function() {
                            delete this.datasetImport.attributes.completedStamp;
                            this.datasetImport.set({destinationDataset:{id: 2}});
                            this.spy.andReturn(
                                this.datasetImport
                            );
                        });
                        it("display inProgressText with a link to the table", function() {
                            expect(presenter.inProgressText().toString()).toMatchTranslation("import.in_progress", { tableLink: presenter._linkToModel(this.datasetImport.destination(), this.datasetImport.destination().name())});
                        });

                    });
                });

                describe("successfully finished import", function() {
                    beforeEach(function() {
                        spyOn(resource, 'lastImport').andReturn(
                            this.datasetImport
                        );
                    });

                    it("has normal lastImport text", function() {
                        expect(presenter.importInProgress()).toBeFalsy();
                        expect(presenter.importFailed()).toBeFalsy();
                        expect(presenter.lastImport()).toMatch("Imported 1 month ago into");
                    });

                    context("for an existing table", function() {
                        beforeEach(function() {
                            this.datasetImport.set({destinationDataset: {id: 12345}}, {silent: true});
                        });

                        it("should have a link to the destination table", function() {
                            expect(presenter.lastImport()).toMatch("into <a ");
                            expect(presenter.lastImport()).toMatch(this.datasetImport.name());
                        });
                    });

                    context("for a deleted table", function() {
                        beforeEach(function() {
                            this.datasetImport.set({destinationDataset: { id: null}}, {silent: true});
                        });

                        it("should not have a link to the destination table", function() {
                            expect(presenter.lastImport()).not.toMatch("into <a ");
                            expect(presenter.lastImport()).toMatch(this.datasetImport.name());
                        });
                    });
                });

                describe("failed import", function() {
                    beforeEach(function() {
                        this.datasetImport.attributes.success = false;
                        spyOn(resource, 'lastImport').andReturn(
                            this.datasetImport
                        );
                    });

                    it("has failed lastImport text", function() {
                        expect(presenter.importInProgress()).toBeFalsy();
                        expect(presenter.importFailed()).toBeTruthy();
                        expect(presenter.lastImport()).toMatch("Import failed 1 month ago into");
                    });

                    context("for an existing table", function() {
                        beforeEach(function() {
                            this.datasetImport.set({destinationDataset: {id: 12345}}, {silent: true});
                        });

                        it("should have a link to the destination table", function() {
                            expect(presenter.lastImport()).toMatch("<a ");
                            expect(presenter.lastImport()).toMatch(this.datasetImport.name());
                        });
                    });

                    context("for a new table", function() {
                        beforeEach(function() {
                            this.datasetImport.set({destinationDataset: { id: null}}, {silent: true});
                        });

                        it("should not have a link to the destination table", function() {
                            expect(presenter.lastImport()).not.toMatch("<a ");
                            expect(presenter.lastImport()).toMatch(this.datasetImport.name());
                        });
                    });
                });
            });

            context("for a sandbox table", function() {
                beforeEach(function() {
                    this.datasetImport = backboneFixtures.workspaceImportSet().first();
                    this.datasetImport.set({
                        sourceDataset: { id: resource.get('id') + 1, objectName: "the_juice"},
                        completedStamp: Date.parse("Today - 33 days").toJSONString(),
                        success: true
                    });
                });

                describe("unfinished import", function() {
                    beforeEach(function() {
                        delete this.datasetImport.attributes.completedStamp;
                        spyOn(resource, 'lastImport').andReturn(
                            this.datasetImport
                        );
                    });
                    it("has inProgressText and lastImport", function() {
                        expect(presenter.inProgressText().toString()).toMatchTranslation("import.in_progress_into", { tableLink: presenter._linkToModel(this.datasetImport.source(), this.datasetImport.source().name())});
                        expect(presenter.importInProgress()).toBeTruthy();
                        expect(presenter.importFailed()).toBeFalsy();
                        expect(presenter.lastImport()).toMatch("Import started");
                    });
                });

                describe("successfully finished import", function() {
                    beforeEach(function() {
                        spyOn(resource, 'lastImport').andReturn(
                            this.datasetImport
                        );
                    });

                    it("has normal lastImport text", function() {
                        expect(presenter.importInProgress()).toBeFalsy();
                        expect(presenter.importFailed()).toBeFalsy();
                        expect(presenter.lastImport()).toMatch("Imported 1 month ago from <a");
                    });
                });

                describe("successfully finished import", function() {
                    beforeEach(function() {
                        this.datasetImport.set({
                            sourceDataset: { objectName: "the_juice" },
                            completedStamp: Date.parse("Today - 33 days").toJSONString(),
                            success: true
                        });
                        spyOn(resource, 'lastImport').andReturn(
                            this.datasetImport
                        );
                    });

                    it("has normal lastImport text", function() {
                        expect(presenter.importInProgress()).toBeFalsy();
                        expect(presenter.importFailed()).toBeFalsy();
                        expect(presenter.lastImport()).toMatch("Imported 1 month ago from");
                        expect(presenter.lastImport()).not.toMatch("from <a");
                    });
                });

                describe("import from a file", function() {
                    beforeEach(function() {
                        this.datasetImport.set("sourceDataset", null);
                        this.datasetImport.set("fileName", "foo.csv");
                        spyOn(resource, 'lastImport').andReturn(
                            this.datasetImport
                        );
                    });

                    it("shows last import from file text", function() {
                        expect(presenter.importInProgress()).toBeFalsy();
                        expect(presenter.importFailed()).toBeFalsy();
                        expect(presenter.lastImport()).toMatch("Imported 1 month ago from");
                        expect(presenter.lastImport()).toMatch("foo.csv");
                    });
                });

                describe("failed import", function() {
                    beforeEach(function() {
                        this.datasetImport.attributes.success = false;
                        spyOn(resource, 'lastImport').andReturn(
                            this.datasetImport
                        );
                    });

                    it("has failed lastImport text", function() {
                        expect(presenter.importInProgress()).toBeFalsy();
                        expect(presenter.importFailed()).toBeTruthy();
                        expect(presenter.lastImport()).toMatch("Import failed 1 month ago from");
                    });
                });
            });
        });
    });

    context("with a workspace dataset", function() {
        var presenter, resource;
        beforeEach(function() {
            resource = backboneFixtures.workspaceDataset.datasetTable();
            resource.workspace()._sandbox = new chorus.models.Sandbox({ id: 123 });
            presenter = new chorus.presenters.DatasetSidebar(resource);
        });

        it("returns everything", function() {
            expect(presenter.workspaceArchived()).toBeFalsy();
            expect(presenter.workspaceId()).not.toBeEmpty();
        });

        context("with a table", function() {
            beforeEach(function() {
                this.resource = backboneFixtures.workspaceDataset.datasetTable();
                this.resource.workspace()._sandbox = new chorus.models.Sandbox({ id: 123 });
                this.presenter = new chorus.presenters.DatasetSidebar(this.resource);
            });

            it("returns everything", function() {
                expect(this.presenter.workspaceArchived()).toBeFalsy();
                expect(this.presenter.importsEnabled()).toBeTruthy();
                expect(this.presenter.workspaceId()).not.toBeEmpty();
            });

            context("when the searchPage option is true", function() {
                beforeEach(function() {
                    this.presenter = new chorus.presenters.DatasetSidebar(this.resource, {searchPage: true});
                });

                it("returns everything", function() {
                    itBehavesLikeAGpdbDataset(this.presenter);
                });

                context("when the searchPage option is true", function() {
                    var presenter;
                    beforeEach(function() {
                        presenter = new chorus.presenters.DatasetSidebar(resource, {searchPage: true});
                    });

                    it("returns everything", function() {
                        itBehavesLikeAGpdbDataset(presenter);
                    });
                });
            });
        });

        context("from a jdbc source", function() {
            beforeEach(function() {
                var resource = backboneFixtures.workspaceDataset.jdbcTable();
                this.presenter = new chorus.presenters.DatasetSidebar(resource);
            });

            it("cannot export", function() {
                expect(this.presenter.canExport()).toBeFalsy();
            });

            it("is associable", function () {
                expect(this.presenter.canAssociate()).toBeTruthy();
            });

            it("does not allow importing at all", function () {
                expect(this.presenter.importsEnabled()).toBeFalsy();
            });
        });
    });

    context("with an Oracle dataset", function() {
        beforeEach(function() {
            var resource = backboneFixtures.oracleDataset();
            this.presenter = new chorus.presenters.DatasetSidebar(resource);
        });

        it("cannot export", function() {
            expect(this.presenter.canExport()).toBeFalsy();
        });

        it("is associable", function () {
            expect(this.presenter.canAssociate()).toBeTruthy();
        });
    });

    context("with a Postgres dataset", function() {
        beforeEach(function() {
            var resource = backboneFixtures.pgDataset();
            this.presenter = new chorus.presenters.DatasetSidebar(resource);
        });

        it("cannot export", function() {
            expect(this.presenter.canExport()).toBeFalsy();
        });

        it("is associable", function () {
            expect(this.presenter.canAssociate()).toBeTruthy();
        });

        it("does not allow importing at all", function () {
            expect(this.presenter.importsEnabled()).toBeFalsy();
        });
    });

    context("with a JDBC dataset", function() {
        beforeEach(function() {
            var resource = backboneFixtures.jdbcDataset();
            this.presenter = new chorus.presenters.DatasetSidebar(resource);
        });

        it("cannot export", function() {
            expect(this.presenter.canExport()).toBeFalsy();
        });

        it("is associable", function () {
            expect(this.presenter.canAssociate()).toBeTruthy();
        });

        it("does not allow importing at all", function () {
            expect(this.presenter.importsEnabled()).toBeFalsy();
        });
    });

    context("with a chorus view", function() {
        beforeEach(function() {
            var resource = backboneFixtures.workspaceDataset.chorusView();
            this.presenter = new chorus.presenters.DatasetSidebar(resource);
        });
        it("prohibits non-members from duplicating chorus views", function() {
            spyOn(this.presenter.resource.workspace(), 'currentUserCanDuplicateChorusViews').andReturn(false);
            expect(this.presenter.currentUserCanDuplicateChorusViews()).toBe(false);
        });

        it("permits members to duplicate chorus views", function() {
            spyOn(this.presenter.resource.workspace(), 'currentUserCanDuplicateChorusViews').andReturn(true);
            expect(this.presenter.currentUserCanDuplicateChorusViews()).toBe(true);
        });

        it("is not associable", function () {
            expect(this.presenter.canAssociate()).toBeFalsy();
        });
    });

    context("with an hdfs dataset", function() {
        beforeEach(function() {
            var resource = backboneFixtures.workspaceDataset.hdfsDataset();
            this.presenter = new chorus.presenters.DatasetSidebar(resource);
        });

        it("permits editing file mask", function() {
            expect(this.presenter.isHdfsDataset()).toBeTruthy();
        });

        it("does not allow importing at all", function () {
            expect(this.presenter.importsEnabled()).toBeFalsy();
        });

        it("does not allow exporting at all", function () {
            expect(this.presenter.canExport()).toBeFalsy();
        });

        it("is deletable", function () {
            expect(this.presenter.isDeleteable()).toBeTruthy();
        });

        it("is not associable", function () {
            expect(this.presenter.canAssociate()).toBeFalsy();
        });
    });
});
