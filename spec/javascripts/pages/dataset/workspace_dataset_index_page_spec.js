describe("chorus.pages.WorkspaceDatasetIndexPage", function() {
    beforeEach(function() {
        spyOn(_, "debounce").andCallThrough();
        this.modalSpy = stubModals();
        this.workspace = rspecFixtures.workspace({
            id: 9999,
            permission: [
                "update"
            ]
        });
        chorus.page = this.page = new chorus.pages.WorkspaceDatasetIndexPage(this.workspace.get("id"));
        chorus.bindModalLaunchingClicks(this.page);
    });

    it("has a helpId", function() {
        expect(this.page.helpId).toBe("datasets")
    });

    describe("#initialize", function() {
        it("fetches the workspace", function() {
            expect(this.workspace).toHaveBeenFetched();
        });

        it("sets the workspace id, for prioritizing search", function() {
            expect(this.page.workspaceId).toBe(9999);
        });

        it("fetches the collection", function() {
            expect(this.server.lastFetchFor(this.page.collection)).toBeDefined();
        });

        it("#render shows a loading message", function() {
            this.page.render();
            expect(this.page.$(".loading_section")).toExist();
        });

        context("when the workspace fetch completes", function() {
            beforeEach(function() {
                spyOn(this.page.mainContent.contentDetails, "postRender").andCallThrough();
            });

            context("when the instance is provisioning", function() {
                beforeEach(function() {
                    this.workspace.attributes.sandboxInfo.database.instance.state = 'provisioning';
                    this.server.completeFetchFor(this.workspace);
                });

                it("sets the provisioningState to 'provisioning' on the content details view", function() {
                    expect(this.page.mainContent.contentDetails.provisioningState).toBe("provisioning");
                    expect(this.page.mainContent.contentDetails.postRender).toHaveBeenCalled();
                });
            });

            context("when the instance failed provisioning", function() {
                beforeEach(function() {
                    this.workspace.attributes.sandboxInfo.database.instance.state = 'fault';
                    this.server.completeFetchFor(this.workspace);
                });

                it("sets the provisioningState to 'fault' on the content details view", function() {
                    expect(this.page.mainContent.contentDetails.provisioningState).toBe("fault");
                    expect(this.page.mainContent.contentDetails.postRender).toHaveBeenCalled();
                });
            });
        });
    });

    describe("when a fetch fails", function() {
        beforeEach(function() {
            spyOn(Backbone.history, "loadUrl")
        });

        it("navigates to the 404 page when the workspace fetch fails", function() {
            this.page.workspace.trigger('resourceNotFound', this.page.workspace);
            expect(Backbone.history.loadUrl).toHaveBeenCalledWith("/invalidRoute")
        });

        it("navigates to the 404 page when the collection fetch fails", function() {
            this.page.collection.trigger('resourceNotFound', this.page.collection);
            expect(Backbone.history.loadUrl).toHaveBeenCalledWith("/invalidRoute")
        });
    });

    context("it does not have a sandbox", function() {
        beforeEach(function() {
            this.workspace.attributes.sandboxInfo = null;
        });

        context("and the user is an admin", function() {
            beforeEach(function() {
                this.workspace.set({permission: ['admin']});
                setLoggedInUser({ id: 11, admin: true});
                this.server.completeFetchFor(this.workspace);
            });

            itHandlesTheWorkspaceResponse(t("dataset.import.need_sandbox", {
                hereLink: '<a class="dialog" href="#" data-dialog="SandboxNew" data-workspace-id="9999">' + t("actions.click_here") + '</a>'
            }))
        });

        context("and the user is the workspace owner", function() {
            beforeEach(function() {
                setLoggedInUser({ id: this.workspace.get("owner").id, admin: false});
                this.server.completeFetchFor(this.workspace);
            });

            itHandlesTheWorkspaceResponse(t("dataset.import.need_sandbox", {
                hereLink: '<a class="dialog" href="#" data-dialog="SandboxNew" data-workspace-id="9999">' + t("actions.click_here") + '</a>'
            }))
        });

        context("and the user is neither an admin nor the workspace owner", function() {
            beforeEach(function() {
                setLoggedInUser({ id: "888", admin: false});
                this.server.completeFetchFor(this.workspace);
            });

            itHandlesTheWorkspaceResponse(t("dataset.import.need_sandbox_no_permissions"))
        });

        function itHandlesTheWorkspaceResponse(helpText) {
            it("fetches the dataset collection", function() {
                expect(this.workspace.sandbox()).toBeUndefined();
                expect(this.server.lastFetchFor(this.page.collection)).toBeDefined();
            })

            describe("when the fetch returns no items", function() {
                beforeEach(function() {
                    this.datasets = [
                    ];
                    this.server.lastFetchFor(this.page.collection).succeed(this.datasets);
                })

                it("has no items", function() {
                    expect(this.page.collection.length).toBe(0)
                })
            });

            describe("when the fetch returns two items", function() {
                beforeEach(function() {
                    this.datasets = [
                        rspecFixtures.workspaceDataset.datasetTable(),
                        rspecFixtures.workspaceDataset.datasetTable()
                    ];
                    this.server.lastFetchFor(this.page.collection).succeed(this.datasets);
                })

                it("has two items", function() {
                    expect(this.page.collection.length).toBe(2)
                })
            });

            describe("the import file button", function() {
                beforeEach(function() {
                    this.page.render();
                })

                it("is disabled", function() {
                    expect(this.page.mainContent.contentDetails.$("button")).toBeDisabled();
                })

                it("has a help icon", function() {
                    expect(this.page.mainContent.contentDetails.$('img.help')).toExist();
                })

                it("has the correct help text", function() {
                    expect(this.page.mainContent.contentDetails.$("img.help").attr("data-text")).toBe(helpText);
                })
            })
        }
    });

    context("after the workspace and collection have loaded", function() {
        context("and the user has update permission on the workspace", function() {
            beforeEach(function() {
                this.server.completeFetchFor(this.workspace);
                this.server.completeFetchFor(this.page.collection);
                this.account = this.workspace.sandbox().instance().accountForCurrentUser();
            });

            it("creates the sidebar", function() {
                expect(this.page.sidebar).toBeDefined();
                expect(this.page.sidebar.options.workspace.id).toEqual(this.workspace.id);
            });

            it("has breadcrumbs", function() {
                expect(this.page.$(".breadcrumbs")).toContainTranslation("breadcrumbs.workspaces_data");
            });

            it("creates the main content", function() {
                expect(this.page.mainContent).toBeDefined();
                expect(this.page.mainContent.model).toBeA(chorus.models.Workspace);
                expect(this.page.mainContent.model.get("id")).toBe(this.workspace.get("id"));
                expect(this.page.$("#main_content")).toExist();
                expect(this.page.$("#main_content")).not.toBeEmpty();
            });

            it("creates the header and breadcrumbs", function() {
                expect(this.page.$("#header")).toExist();
                expect(this.page.$("#breadcrumbs")).toExist();
            });

            it("shows the page title", function() {
                expect(this.page.$('.content_header h1').text().trim()).toEqual(t('dataset.title'));
            });

            it("has a search bar in the content header", function() {
                expect(this.page.$("input.search").attr("placeholder")).toMatchTranslation("workspace.search");
            });

            it("fetches the collection when csv_import:started is triggered", function() {
                spyOn(this.page.collection, 'fetch').andCallThrough();
                chorus.PageEvents.broadcast("csv_import:started");
                expect(this.page.collection.fetch).toHaveBeenCalled();
            });

            context("it has a sandbox", function() {
                it("fetches the account for the current user", function() {
                    expect(this.server.lastFetchFor(this.account)).not.toBeUndefined();
                });

                describe("the 'import file' button", function() {
                    beforeEach(function() {
                        this.page.render();
                    });

                    it("has the right text", function() {
                        expect(this.page.$("button[data-dialog='DatasetImport']").text()).toMatchTranslation("dataset.import.title");
                    });

                    it("has the right data attributes", function() {
                        expect(this.page.$("button[data-dialog='DatasetImport']").data("workspaceId").toString()).toBe(this.workspace.id.toString());
                        expect(this.page.$("button[data-dialog='DatasetImport']").data("canonicalName")).toBe(this.workspace.sandbox().canonicalName());
                    });

                    describe("when the button is clicked", function() {
                        beforeEach(function() {
                            this.page.$("button[data-dialog='DatasetImport']").click();
                        });

                        it("launches an Import File dialog", function() {
                            expect(this.modalSpy).toHaveModal(chorus.dialogs.DatasetImport);
                        });
                    });

                    it("displays the sandbox location in the header", function () {
                        expect(this.page.mainContent.contentHeader.$(".found_in a").eq(0).text()).toBe(this.workspace.sandbox().instance().name());
                        expect(this.page.mainContent.contentHeader.$(".found_in a").eq(1).text()).toBe(this.workspace.sandbox().database().name());
                        expect(this.page.mainContent.contentHeader.$(".found_in a").eq(2).text()).toBe(this.workspace.sandbox().schema().name());
                    });

                });

                context("when the account loads and is empty and the instance account maps are individual", function() {

                    beforeEach(function() {
                        spyOnEvent(this.page.collection, 'reset');
                        this.server.completeFetchFor(this.account, rspecFixtures.instanceAccount({"id":null}));
                        expect(this.page.instance.isShared()).toBeFalsy();
                    });

                    it("pops up a WorkspaceInstanceAccount dialog", function() {

                        expect(this.modalSpy).toHaveModal(chorus.dialogs.WorkspaceInstanceAccount);
                        expect(this.page.dialog.model).toBe(this.page.account);
                        expect(this.page.dialog.pageModel).toBe(this.page.workspace);
                    });

                    context("after the account has been created", function() {
                        beforeEach(function() {
                            spyOn(this.page.collection, 'fetch').andCallThrough();
                            this.page.account.trigger('saved');
                        });

                        it("fetches the datasets", function() {
                            expect(this.page.collection.fetch).toHaveBeenCalled();
                        })
                    });

                    context('navigating to the page a second time', function() {
                        beforeEach(function() {
                            this.modalSpy.reset();
                            this.server.reset();
                            this.page = new chorus.pages.WorkspaceDatasetIndexPage(this.workspace.get("id"));
                            this.server.completeFetchFor(this.workspace);
                            this.server.completeFetchFor(this.page.account, rspecFixtures.instanceAccount({"id":null}));
                        });

                        it("should not pop up the WorkspaceInstanceAccountDialog", function() {
                            expect(this.modalSpy).not.toHaveModal(chorus.dialogs.WorkspaceInstanceAccount);
                        });
                    });
                });

                context("when the account loads and is empty and the instance is shared", function() {
                    beforeEach(function() {
                        spyOnEvent(this.page.collection, 'reset');
                        this.page.instance.set({"shared": true});
                        expect(this.page.instance.isShared()).toBeTruthy();
                        this.server.completeFetchFor(this.page.account, rspecFixtures.instanceAccount({"id":null}));
                    });

                    it("does not pop up a WorkspaceInstanceAccount dialog", function() {
                        expect(this.modalSpy).not.toHaveModal(chorus.dialogs.WorkspaceInstanceAccount);
                    });
                });

                context("when the account loads and is valid", function() {
                    beforeEach(function() {
                        this.server.completeFetchFor(this.account, rspecFixtures.instanceAccount())
                    });

                    it("does not pop up the WorkspaceInstanceAccountDialog", function() {
                        expect(this.modalSpy).not.toHaveModal(chorus.dialogs.WorkspaceInstanceAccount);
                    });

                    describe("filtering", function() {
                        beforeEach(function() {
                            this.page.render();
                            this.page.collection.type = undefined;
                            spyOn(this.page.collection, 'fetch').andCallThrough();
                        });

                        it("has options for filtering", function() {
                            expect(this.page.$("ul[data-event=filter] li[data-type=]")).toExist();
                            expect(this.page.$("ul[data-event=filter] li[data-type=SOURCE_TABLE]")).toExist();
                            expect(this.page.$("ul[data-event=filter] li[data-type=CHORUS_VIEW]")).toExist();
                            expect(this.page.$("ul[data-event=filter] li[data-type=SANDBOX_DATASET]")).toExist();
                        });

                        it("can filter the list by 'all'", function() {
                            this.page.$("li[data-type=] a").click();
                            expect(this.page.collection.attributes.type).toBe("");
                            expect(this.page.collection.fetch).toHaveBeenCalled();
                        });

                        it("has can filter the list by 'SOURCE_TABLE'", function() {
                            this.page.$("li[data-type=SOURCE_TABLE] a").click();
                            expect(this.page.collection.attributes.type).toBe("SOURCE_TABLE");
                            expect(this.page.collection.fetch).toHaveBeenCalled();
                            expect(this.server.lastFetch().url).toContain("/workspaces/" + this.workspace.get("id") + "/datasets?type=SOURCE_TABLE");
                        });

                        it("has can filter the list by 'SANBOX_TABLE'", function() {
                            this.page.$("li[data-type=SANDBOX_DATASET] a").click();
                            expect(this.page.collection.attributes.type).toBe("SANDBOX_DATASET");
                            expect(this.page.collection.fetch).toHaveBeenCalled();
                            expect(this.server.lastFetch().url).toContain("/workspaces/" + this.workspace.get("id") + "/datasets?type=SANDBOX_DATASET");
                        });

                        it("has can filter the list by 'CHORUS_VIEW'", function() {
                            this.page.$("li[data-type=CHORUS_VIEW] a").click();
                            expect(this.page.collection.attributes.type).toBe("CHORUS_VIEW");
                            expect(this.page.collection.fetch).toHaveBeenCalled();
                            expect(this.server.lastFetch().url).toContain("/workspaces/" + this.workspace.get("id") + "/datasets?type=CHORUS_VIEW");
                        });
                    });

                    describe("search", function() {
                        beforeEach(function() {
                            this.page.$("input.search").val("foo").trigger("keyup");
                        });

                        it("shows the Loading text in the count span", function() {
                            expect($(this.page.$(".count"))).toContainTranslation("loading");
                        });

                        it("throttles the number of search requests", function() {
                            expect(_.debounce).toHaveBeenCalled();
                        });

                        it("re-fetches the collection with the search parameters", function() {
                            expect(this.server.lastFetch().url).toContainQueryParams({namePattern: "foo"});
                        });

                        context("when the fetch completes", function() {
                            beforeEach(function() {
                                spyOn(this.page.mainContent, "render").andCallThrough();
                                spyOn(this.page.mainContent.content, "render").andCallThrough();
                                spyOn(this.page.mainContent.contentFooter, "render").andCallThrough();
                                spyOn(this.page.mainContent.contentDetails, "render").andCallThrough();
                                spyOn(this.page.mainContent.contentDetails, "updatePagination").andCallThrough();
                                this.server.completeFetchFor(this.page.collection);
                            });

                            it("updates the header, footer, and body", function() {
                                expect(this.page.mainContent.content.render).toHaveBeenCalled();
                                expect(this.page.mainContent.contentFooter.render).toHaveBeenCalled();
                                expect(this.page.mainContent.contentDetails.updatePagination).toHaveBeenCalled();
                            });

                            it("does not re-render the page or body", function() {
                                expect(this.page.mainContent.render).not.toHaveBeenCalled();
                                expect(this.page.mainContent.contentDetails.render).not.toHaveBeenCalled();
                            });
                            it("shows the Loading text in the count span", function() {
                                expect($(this.page.$(".count"))).not.toMatchTranslation("loading");
                            });
                        });
                    });
                });
            });
        });

        context("and the user does not have update permission on the workspace", function() {
            beforeEach(function() {
                this.workspace.set({ permission: ["read"]})
                this.server.completeFetchFor(this.workspace);
            });

            it("removes the import button", function() {
                expect(this.page.mainContent.contentDetails.$("button")).not.toExist();
            });
        });

        context("and the workspace is archived", function() {
            beforeEach(function() {
                this.workspace.set({ archivedAt: "2012-05-08 21:40:14"});
                this.server.completeFetchFor(this.workspace);
            });

            it("has no buttons", function() {
                expect(this.page.$("button")).not.toExist();
            });
        });
    });

    describe("when the workfile:selected event is triggered on the list view", function() {
        beforeEach(function() {
            this.server.completeFetchFor(this.workspace);
            this.page.render();

            this.dataset = rspecFixtures.workspaceDataset.datasetTable();
            chorus.PageEvents.broadcast("dataset:selected", this.dataset);
        })

        it("sets the selected dataset as its own model", function() {
            expect(this.page.model).toBe(this.dataset);
        });
    });
});
