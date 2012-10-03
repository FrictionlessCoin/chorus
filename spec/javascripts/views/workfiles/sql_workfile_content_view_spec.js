describe("chorus.views.SqlWorkfileContentView", function() {
    beforeEach(function() {
        this.workfile = fixtures.sqlWorkfile({ content: "select * from foos where bar_id = 1;" });
        this.schema = fixtures.schema({
            id: '4',
            name: "schema",
            databaseId: '3',
            databaseName: "db",
            instanceId: '2',
            instanceName: "instance"
        });
        spyOn(this.workfile, 'executionSchema').andCallFake(_.bind(function() {return this.schema}, this));
        spyOn(chorus.views.SqlWorkfileContent.prototype, "runInDefault").andCallThrough();
        spyOn(chorus.views.SqlWorkfileContent.prototype, "runSelected").andCallThrough();
        this.view = new chorus.views.SqlWorkfileContent({model: this.workfile});
        stubDefer();
    });

    describe("initialization", function() {
        it("has a TextWorkfileContent view", function() {
            expect(this.view.textContent).toBeA(chorus.views.TextWorkfileContent);
            expect(this.view.textContent.options.hotkeys).toBe(this.view.hotkeys);
        })

        it("has a ResultsConsole view", function() {
            expect(this.view.resultsConsole).toBeA(chorus.views.ResultsConsole);
        });

        it("enables the resize area of the results console", function() {
            expect(this.view.resultsConsole.options.enableResize).toBeTruthy();
        });

        it("displays the expander of the results console", function() {
            expect(this.view.resultsConsole.options.enableExpander).toBeTruthy();
        });

        it("declares hotkeys", function() {
            expect(this.view.hotkeys.r).toBeDefined();
        })
    });

    describe("hotkeys", function() {
        beforeEach(function() {
            // stop actually calling through (there's no clean way to do this in Jasmine)
            this.view.runInDefault.andReturn();
            this.view.runSelected.andReturn();
            spyOn(chorus.PageEvents, "broadcast").andCallThrough();
        });

        it("correctly binds the R hotkey to runInDefault", function() {
            chorus.triggerHotKey('r');
            expect(chorus.PageEvents.broadcast.calls[0].args[0]).toBe("file:runCurrent");
            expect(this.view.runInDefault).toHaveBeenCalled();
        });

        it("correctly binds the E hotkey to runSelected", function() {
            chorus.triggerHotKey('e');
            expect(chorus.PageEvents.broadcast.calls[0].args[0]).toBe("file:runSelected");
            expect(this.view.runSelected).toHaveBeenCalled();
        });
    });

    describe("executing the workfile", function() {
        beforeEach(function() {
            spyOn($, 'fileDownload');
            spyOn(chorus.PageEvents, "broadcast").andCallThrough();
            this.view.render();
            this.view.textContent.editor.setValue("select * from foos");
        });

        context("when no execution is outstanding", function() {
            describe("running in another schema", function() {
                beforeEach(function() {
                    chorus.PageEvents.broadcast("file:runInSchema", {
                        instance: '4',
                        database: '5',
                        schema: '6'
                    })
                })

                it("creates a task with the right parameters", function() {
                    expect(this.view.task.get("sql")).toBe("select * from foos");
                    expect(this.view.task.get("instanceId")).toBe("4");
                    expect(this.view.task.get("databaseId")).toBe("5");
                    expect(this.view.task.get("schemaId")).toBe("6");
                    expect(this.view.task.get("entityId")).toBe(this.workfile.get("id"));
                    expect(this.view.task.has("checkId")).toBeTruthy();
                });
            });

            describe("running in the default schema", function() {
                context("when the workfile has a schema in which to execute", function() {
                    beforeEach(function() {
                        this.executionInfo = {
                            instanceId: '4',
                            instanceName: "ned",
                            databaseId: '5',
                            databaseName: "rob",
                            schemaId: '6',
                            schemaName: "louis"
                        }

                        chorus.PageEvents.broadcast("file:runCurrent");
                    });

                    it("creates a task with the right parameters", function() {
                        expect(this.view.task.get("sql")).toBe("select * from foos");
                        expect(this.view.task.get("instanceId")).toBe("2");
                        expect(this.view.task.get("databaseId")).toBe("3");
                        expect(this.view.task.get("schemaId")).toBe("4");
                        expect(this.view.task.get("entityId")).toBe(this.workfile.get("id"));
                        expect(this.view.task.has("checkId")).toBeTruthy();
                    });

                    it("saves the task", function() {
                        expect(this.server.creates().length).toBe(1);
                        expect(this.server.lastCreate().url).toBe(this.view.task.url());
                    });

                    it("broadcasts file:executionStarted", function() {
                        expect(chorus.PageEvents.broadcast).toHaveBeenCalledWith("file:executionStarted", jasmine.any(chorus.models.SqlExecutionTask));
                    });

                    describe("when the task completes successfully", function() {
                        beforeEach(function() {
                            this.server.lastCreate().succeed([
                                {
                                    id: "10100",
                                    state: "success",
                                    result: {
                                        message: "hi there"
                                    },
                                    executionInfo: this.executionInfo
                                }
                            ]);
                        })

                        it("broadcasts file:executionSucceeded", function() {
                            expect(chorus.PageEvents.broadcast).toHaveBeenCalledWith("file:executionSucceeded", jasmine.any(chorus.models.SqlExecutionTask));
                        });

                        it("sets the executing property to false", function() {
                            expect(this.view.executing).toBeFalsy();
                        });

                        it("broadcasts workfile:executed", function() {
                            expect(chorus.PageEvents.broadcast).toHaveBeenCalledWith("workfile:executed", this.workfile, this.executionInfo);
                        })

                        describe("executing again", function() {
                            beforeEach(function() {
                                chorus.PageEvents.broadcast("file:runCurrent");
                            })

                            it("executes the task again", function() {
                                expect(this.server.creates().length).toBe(2);
                            })
                        })
                    });

                    describe("when the task completion fails", function() {
                        beforeEach(function() {
                            this.server.lastCreate().fail("it broke", [
                                { executionInfo: this.executionInfo }
                            ]);
                        })

                        it("broadcasts file:executionFailed", function() {
                            expect(chorus.PageEvents.broadcast).toHaveBeenCalledWith("file:executionFailed", jasmine.any(chorus.models.SqlExecutionTask), jasmine.any(Object));
                        });

                        it("sets the executing property to false", function() {
                            expect(this.view.executing).toBeFalsy();
                        });

                        it("broadcasts workfile:executed", function() {
                            expect(chorus.PageEvents.broadcast).toHaveBeenCalledWith("workfile:executed", this.workfile, this.executionInfo);
                        })
                    });

                    describe("when the task is cancelled", function() {
                        beforeEach(function() {
                            chorus.PageEvents.broadcast.reset();
                            this.server.lastCreate().fail(fixtures.serverErrors({message: 'The task is cancelled'}), []);
                        })

                        it("broadcasts file:executionFailed", function() {
                            expect(chorus.PageEvents.broadcast).toHaveBeenCalledWith("file:executionFailed", jasmine.any(chorus.models.SqlExecutionTask), jasmine.any(Object));
                        });

                        it("sets the executing property to false", function() {
                            expect(this.view.executing).toBeFalsy();
                        });

                        it("does not broadcast workfile:executed", function() {
                            expect(chorus.PageEvents.broadcast.callCount).toBe(1);
                        })
                    });
                });

                context("when the workfile has no schema in which to execute", function() {
                    it("does nothing when ctrl-r is pressed", function() {
                        this.workfile.executionSchema.andReturn(undefined);
                        // should not raise error
                        chorus.PageEvents.broadcast("file:runCurrent");
                    });
                });
            });

            describe("with selected text", function() {
                context("when the workfile has an execution schema, and/or the workspace has a sandbox", function() {
                    beforeEach(function() {
                        this.view.model.unset("executionInfo");
                        this.schema = fixtures.schema({id: "77", databaseId: "88", instanceId: "99"});
                        spyOn(this.view.textContent.editor, "getSelection").andReturn("select 1 from table");
                    });

                    context("running selected", function() {
                        beforeEach(function() {
                            chorus.PageEvents.broadcast("file:runSelected");
                        });

                        it("creates a task with the right parameters", function() {
                            expect(this.view.task.get("sql")).toBe("select 1 from table");
                            expect(this.view.task.get("entityId")).toBe(this.workfile.get("id"));
                            expect(this.view.task.has("checkId")).toBeTruthy();
                            expect(this.view.task.get("instanceId")).toBe("99");
                            expect(this.view.task.get("databaseId")).toBe("88");
                            expect(this.view.task.get("schemaId")).toBe("77");
                        });

                        it("saves the task", function() {
                            expect(this.server.creates().length).toBe(1);
                            expect(this.server.lastCreate().url).toBe(this.view.task.url());
                        });
                    });

                    context("running and downloading", function() {
                        context("all rows", function() {
                            beforeEach(function() {
                                chorus.PageEvents.broadcast("file:runAndDownload", {selection: true});
                            });

                            it("creates a task with the right parameters", function() {
                                expect(this.view.task).toBeA(chorus.models.SqlExecutionAndDownloadTask);
                                expect(this.view.task.get("sql")).toBe("select 1 from table");
                                expect(this.view.task.get("instanceId")).toBe("99");
                                expect(this.view.task.get("databaseId")).toBe("88");
                                expect(this.view.task.get("schemaId")).toBe("77");
                                expect(this.view.task.get("entityId")).toBe(this.workfile.get("id"));
                                expect(this.view.task.get("numOfRows")).toBeUndefined();
                            });
                        });

                        context("some rows", function() {
                            beforeEach(function() {
                                chorus.PageEvents.broadcast("file:runAndDownload", {numOfRows: "867", selection: true});
                            });

                            it("creates a task with the right parameters", function() {
                                expect(this.view.task).toBeA(chorus.models.SqlExecutionAndDownloadTask);
                                expect(this.view.task.get("sql")).toBe("select 1 from table");
                                expect(this.view.task.get("instanceId")).toBe("99");
                                expect(this.view.task.get("databaseId")).toBe("88");
                                expect(this.view.task.get("schemaId")).toBe("77");
                                expect(this.view.task.get("entityId")).toBe(this.workfile.get("id"));
                                expect(this.view.task.get("numOfRows")).toBe("867");
                            });
                        });
                    });
                });
            });

            describe("running and downloading all rows", function() {
                beforeEach(function() {
                    chorus.PageEvents.broadcast("file:runAndDownload");
                });

                it("creates a task with the right parameters", function() {
                    expect(this.view.task).toBeA(chorus.models.SqlExecutionAndDownloadTask);
                    expect(this.view.task.get("sql")).toBe("select * from foos");
                    expect(this.view.task.get("instanceId")).toBe("2");
                    expect(this.view.task.get("databaseId")).toBe("3");
                    expect(this.view.task.get("schemaId")).toBe("4");
                    expect(this.view.task.get("entityId")).toBe(this.workfile.get("id"));
                    expect(this.view.task.get("numOfRows")).toBeUndefined();
                });
            });

            describe("running and downloading some rows", function() {
                beforeEach(function() {
                    chorus.PageEvents.broadcast("file:runAndDownload", {numOfRows: "867"});
                });

                it("creates a task with the right parameters", function() {
                    expect(this.view.task).toBeA(chorus.models.SqlExecutionAndDownloadTask);
                    expect(this.view.task.get("sql")).toBe("select * from foos");
                    expect(this.view.task.get("instanceId")).toBe("2");
                    expect(this.view.task.get("databaseId")).toBe("3");
                    expect(this.view.task.get("schemaId")).toBe("4");
                    expect(this.view.task.get("entityId")).toBe(this.workfile.get("id"));
                    expect(this.view.task.get("numOfRows")).toBe("867");
                });
            });

            context("when an execution is already outstanding", function() {
                beforeEach(function() {
                    chorus.PageEvents.broadcast("file:runCurrent");
                    this.startedSpy = jasmine.createSpy();
                    chorus.PageEvents.subscribe("file:executionStarted", this.startedSpy);
                    chorus.PageEvents.broadcast("file:runCurrent");
                })

                it('does not start a new execution', function() {
                    expect(this.startedSpy).not.toHaveBeenCalled();
                })
            });
        });
    });

    describe("saving as Chorus View", function() {
        beforeEach(function() {
            this.modalSpy = stubModals();
            this.view.render();
            this.view.textContent.editor.setValue("select * from table;");

            this.schema.set({
                instanceId: '51',
                instanceName: "bob_the_instance",
                databaseId: '52',
                databaseName: "bar",
                name: "wow"
            });
        });

        it("displays the modal", function() {
            chorus.PageEvents.broadcast("file:newChorusView");

            expect(this.modalSpy).toHaveModal(chorus.dialogs.VerifyChorusView);
        });

        context("when there is no selection", function() {
            it("sets the Chorus View with while sql content", function() {
                chorus.PageEvents.broadcast("file:newChorusView");

                expect(this.view.chorusView.get("instanceId")).toBe('51');
                expect(this.view.chorusView.get("instanceName")).toBe('bob_the_instance');
                expect(this.view.chorusView.get("instance").id).toBe('51');
                expect(this.view.chorusView.get("instance").name).toBe('bob_the_instance');
                expect(this.view.chorusView.get("databaseName")).toBe('bar');
                expect(this.view.chorusView.get("schemaName")).toBe('wow');
                expect(this.view.chorusView.get("query")).toBe('select * from table;');
                expect(this.view.chorusView.get("sourceObjectId")).toBe(this.view.model.id);
                expect(this.view.chorusView.get("objectType")).toBe("QUERY");
            });
        });

        context("when there is a selection", function() {
            it("sets the Chorus View with workspace's sandbox data", function() {
                this.view.textContent.editor.setSelection({line: 0, ch: 0}, {line: 0, ch: 6});

                chorus.PageEvents.broadcast("file:newSelectionChorusView");

                expect(this.view.chorusView.get("instanceId")).toBe('51');
                expect(this.view.chorusView.get("instanceName")).toBe('bob_the_instance');
                expect(this.view.chorusView.get("instance").id).toBe('51');
                expect(this.view.chorusView.get("instance").name).toBe('bob_the_instance');
                expect(this.view.chorusView.get("databaseName")).toBe('bar');
                expect(this.view.chorusView.get("schemaName")).toBe('wow');
                expect(this.view.chorusView.get("query")).toBe('select');
                expect(this.view.chorusView.get("sourceObjectId")).toBe(this.view.model.id);
                expect(this.view.chorusView.get("objectType")).toBe("QUERY");
            });
        });
    });
});
