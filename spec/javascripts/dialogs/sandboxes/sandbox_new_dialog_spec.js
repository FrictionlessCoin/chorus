describe("chorus.dialogs.SandboxNew", function() {
    beforeEach(function() {
        this.workspace = rspecFixtures.workspace({id: 45});
        spyOn(chorus, "toast");
        spyOn(chorus, 'styleSelect');
        spyOn(chorus.router, 'reload');
        this.dialog = new chorus.dialogs.SandboxNew({ workspaceId: 45});
        this.server.completeFetchFor(this.workspace);
        this.dialog.render();
    });

    xit("fetches the aurora provisioning status", function() {
        expect(chorus.models.GpdbInstance.aurora()).toHaveBeenFetched();
    });

    it("fetches the workspace", function() {
        expect(this.dialog.workspace).toHaveBeenFetched();
    });


    context("when the SchemaPicker triggers an error", function() {
        beforeEach(function() {
//            TODO: Uncomment this when the aurora provisioning is done
//            this.server.completeFetchFor(chorus.models.GpdbInstance.aurora());
            var modelWithError = rspecFixtures.schemaSet();
            modelWithError.serverErrors = { fields: { a: { BLANK: {} } } };
            this.dialog.instanceMode.trigger("error", modelWithError);
        });

        it("shows the error", function() {
            expect(this.dialog.$('.errors')).toContainText("A can't be blank");
        });

        context("and then the schemaPicker triggers clearErrors", function(){
            it("clears the errors", function() {
                this.dialog.instanceMode.trigger("clearErrors");
                expect(this.dialog.$('.errors')).toBeEmpty();
            });
        })
    });

    context("when aurora is not configured", function() {
        beforeEach(function() {
//            this.server.completeFetchFor(chorus.models.GpdbInstance.aurora(), { installationStatus: "no" });
        });

        it("does not display the radio buttons", function() {
            expect(this.dialog.$("input:radio[name='sandbox_type']")).not.toExist();
        });

        context("clicking the submit button", function() {
            beforeEach(function() {
                this.sandbox = this.dialog.model;
                spyOn(this.sandbox, 'save').andCallThrough();
            });

            context("without schema selected yet", function() {
                beforeEach(function() {
                    spyOn(this.dialog.instanceMode, 'fieldValues').andReturn({
                        instance: "4",
                        database: "5",
                        schemaName: ""
                    });
                    this.dialog.instanceMode.trigger("change", "");
                });

                it("disables the submit button", function() {
                    expect(this.dialog.$(".modal_controls button.submit")).toBeDisabled();
                });
            });

            it("sets the summary to empty string when it's null", function() {
                this.dialog.workspace.set({summary: null});
                spyOn(this.dialog.instanceMode, 'fieldValues').andReturn({
                    instance: "4",
                    database: "5",
                    schema: "6"
                });
                this.dialog.instanceMode.trigger("change", "6");
                this.dialog.$(".modal_controls button.submit").click();
                expect(this.server.lastUpdate().params()["workspace[summary]"]).toBe("");
            });

            it("retains the summary", function() {
                this.dialog.workspace.set({summary: "test"});
                spyOn(this.dialog.instanceMode, 'fieldValues').andReturn({
                    instance: "4",
                    database: "5",
                    schema: "6"
                });
                this.dialog.instanceMode.trigger("change", "6");
                this.dialog.$(".modal_controls button.submit").click();
                expect(this.server.lastUpdate().params()["workspace[summary]"]).toBe("test");
            });

            context("with a instance id, database id, and schema id", function() {
                context("with a schemaName, instanceId, databaseName in the model", function() {
                    beforeEach(function() {
                        spyOn(this.dialog, 'closeModal');
                        spyOn(this.dialog.instanceMode, 'schemaId').andReturn("6");
                        this.dialog.workspace.set({
                            schemaName: "test_schema",
                            databaseName: "test_database",
                            instanceId: 1,
                            databaseId: 2
                        })
                        this.dialog.instanceMode.trigger("change", "6");
                        this.dialog.$(".modal_controls button.submit").click();
                    });

                    it("unsets the instanceId, schemaName, databaseName and databaseId on the sandbox", function() {
                        expect(this.dialog.workspace.get("schemaName")).toBeUndefined();
                        expect(this.dialog.workspace.get("databaseName")).toBeUndefined();
                        expect(this.dialog.workspace.get("databaseId")).toBeUndefined();
                        expect(this.dialog.workspace.get("instanceId")).toBeUndefined();
                        expect(this.dialog.workspace.get("summary")).toBeDefined();
                    });

                })

                context("without a schemaName, instanceId, databaseName in the model", function() {
                    beforeEach(function() {
                        spyOn(this.dialog, 'closeModal');
                        spyOn(this.dialog.instanceMode, 'schemaId').andReturn("6");
                        this.dialog.instanceMode.trigger("change", "6");
                        this.dialog.$(".modal_controls button.submit").click();
                    });

                    it("doesn't yet display a toast", function() {
                        expect(chorus.toast).not.toHaveBeenCalled();
                    });

                    it("changes the button text to 'Adding...'", function() {
                        expect(this.dialog.$(".modal_controls button.submit").text()).toMatchTranslation("sandbox.adding_sandbox");
                    });

                    it("sets the button to a loading state", function() {
                        expect(this.dialog.$(".modal_controls button.submit").isLoading()).toBeTruthy();
                    });

                    it("saves the workspace with the new sandbox id", function() {
                        expect(this.server.lastUpdate().params()["workspace[sandbox_id]"]).toBe("6");
                    });

                    it("sets the instance, schema and database on the sandbox", function() {
                        expect(this.dialog.workspace.get("sandboxId")).toBe('6');
                    });

                    describe("when save fails", function() {
                        beforeEach(function() {
                            this.server.lastUpdateFor(this.dialog.workspace).failUnprocessableEntity({ fields: { a: { BLANK: {} } } });
                        });

                        it("takes the button out of the loading state", function() {
                            expect(this.dialog.$(".modal_controls button.submit").isLoading()).toBeFalsy();
                        });

                        it("displays the error message", function() {
                            expect(this.dialog.$(".errors")).toContainText("A can't be blank");
                        });
                    });

                    describe("when the model is saved successfully", function() {
                        beforeEach(function() {
                            spyOnEvent(this.dialog.workspace, 'invalidated');
                            spyOn(this.dialog.workspace, 'fetch');
                            this.dialog.workspace.trigger("saved");
                        });

                        context("when the 'noReload' option is set", function() {
                            it("does not reload the page", function() {
                                chorus.router.reload.reset();
                                this.dialog.options.noReload = true;
                                this.sandbox.trigger("saved");
                                expect(chorus.router.reload).not.toHaveBeenCalled();
                            });
                        });

                        context("when the 'noReload' option is falsy", function() {
                            it("reloads the page", function() {
                                expect(chorus.router.reload).toHaveBeenCalled();
                            });
                        });

                        it("shows a toast message", function() {
                            expect(chorus.toast).toHaveBeenCalledWith("sandbox.create.toast");
                        });
                    });
                })

            });

            context("with a instance id, database id, and schema name", function() {
                beforeEach(function() {
                    spyOn(this.dialog.instanceMode, 'fieldValues').andReturn({
                        instance: "4",
                        database: "5",
                        schemaName: "new_schema"
                    });

                    this.dialog.instanceMode.trigger("change", "new_schema");
                    this.dialog.$("button.submit").click();
                });

                it("should set schema name on the model", function() {
                    expect(this.dialog.workspace.get("schemaName")).toBe("new_schema");
                });

                it("saves the workspace with the new sandbox id", function() {
                    expect(this.server.lastUpdate().params()["workspace[schema_name]"]).toBe("new_schema");
                });
            });

            context("with a database name and schema name", function() {
                beforeEach(function() {
                    spyOn(this.dialog.instanceMode, 'fieldValues').andReturn({
                        instance: "4",
                        databaseName: "new_database",
                        schemaName: "new_schema"
                    });

                    this.dialog.instanceMode.trigger("change", "new_schema");
                    this.dialog.$("button.submit").click();
                });

                it("should set the database name and schema name on the model", function() {
                    expect(this.dialog.workspace.get("databaseName")).toBe("new_database");
                    expect(this.dialog.workspace.get("schemaName")).toBe("new_schema");
                    expect(this.dialog.workspace.get("instanceId")).toBe("4");
                });

                it("saves the workspace with the new sandbox id", function() {
                    expect(this.server.lastUpdate().params()["workspace[schema_name]"]).toBe("new_schema");
                    expect(this.server.lastUpdate().params()["workspace[database_name]"]).toBe("new_database");
                    expect(this.server.lastUpdate().params()["workspace[instance_id]"]).toBe("4");
                });
            });
        });
    });

    xcontext("when aurora is configured", function() {
        beforeEach(function() {
            spyOn(this.dialog, "render").andCallThrough();
            this.server.completeFetchFor(chorus.models.GpdbInstance.aurora(), { installationStatus: "install_succeed" });
            this.server.completeFetchFor(chorus.models.Config.instance(), { provisionMaxSizeInGB: 2000 });

        });

        it("enables the 'as a standalone' radio button (not checked)", function() {
            expect(this.dialog.$("input[value='as_standalone']")).toBeEnabled();
            expect(this.dialog.$("input[value='within_instance']").prop("checked")).toBeTruthy();
        });

        it("fetches the aurora templates", function() {
            expect(chorus.models.GpdbInstance.auroraTemplates()).toHaveBeenFetched();
            expect(this.dialog.render).toHaveBeenCalled();
        });

        context("when the aurora template fetch completes", function() {
            beforeEach(function() {
                this.server.completeFetchFor(chorus.models.GpdbInstance.auroraTemplates(), [
                    newFixtures.provisioningTemplate({name: "Small"}),
                    newFixtures.provisioningTemplate({name: "Medium"}),
                    newFixtures.provisioningTemplate({name: "Large"})
                ]);
            });

            it("populates the template select box", function() {
                expect(this.dialog.$("select option").length).toBe(3);
            });
        });

        xdescribe("clicking the 'as a standalone' radio button", function() {
            beforeEach(function() {
                this.dialog.$("input[value='as_standalone']").click();
            });

            it("should show the 'as a standalone' form", function() {
                expect(this.dialog.$(".instance_mode")).toHaveClass("hidden");
                expect(this.dialog.$(".standalone_mode")).not.toHaveClass("hidden");
            });

            it("enables the save button", function() {
                expect(this.dialog.$("button.submit")).toBeEnabled();
            });

            it("validates the model", function() {
                var $el = this.dialog.$(".standalone_mode");
                $el.find("input[name=size]").val("2500");

                this.dialog.$("button.submit").click();
                expect($el.find("input[name=instanceName]")).toHaveClass("has_error");
                expect($el.find("input[name=schemaName]")).not.toHaveClass("has_error");
                expect($el.find("input[name=databaseName]")).toHaveClass("has_error");
                expect($el.find("input[name=size]")).toHaveClass("has_error");
            });

            describe("saving", function() {
                beforeEach(function() {
                    spyOn(this.dialog, "closeModal");
                    this.server.reset();
                    var $el = this.dialog.$(".standalone_mode");
                    $el.find("input[name=instanceName]").val("spiderman");
                    $el.find("input[name=schemaName]").val("batman");
                    $el.find("input[name=databaseName]").val("aquaman");
                    $el.find("input[name=size]").val("1000");
                    $el.find("input[name=dbUsername]").val("edcadmin");
                    $el.find("input[name=dbPassword]").val("foobar");

                    this.dialog.$("button.submit").click();
                });

                it("saves the model", function() {
                    expect(this.server.lastCreateFor(this.dialog.model)).toBeDefined();
                });

                it("puts the button in a loading state", function() {
                    expect(this.dialog.$("button.submit").isLoading()).toBeTruthy();
                });

                it("displays a toast", function() {
                    expect(chorus.toast).toHaveBeenCalledWith("instances.new_dialog.provisioning");
                });

                context("when the save completes", function() {
                    beforeEach(function() {
                        this.server.completeSaveFor(this.dialog.model);
                    });

                    it("does not show added-a-sandbox toast (bc it may take a while)", function() {
                        expect(chorus.toast).not.toHaveBeenCalledWith("sandbox.create.toast");
                    });

                    it("dismisses the dialog", function() {
                        expect(this.dialog.closeModal).toHaveBeenCalled();
                    });
                });
            });
        });

        context("clicking the 'within an instance' radio button", function() {
            beforeEach(function() {
                this.dialog.$("input[value='within_instance']").click();
            });

            it("should show the 'within an instance' form", function() {
                expect(this.dialog.$(".instance_mode")).not.toHaveClass("hidden");
                expect(this.dialog.$(".standalone_mode")).toHaveClass("hidden");
            });
        });
    })
});
