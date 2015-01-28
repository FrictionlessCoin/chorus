describe("chorus.views.ResultsConsoleView", function() {
    beforeEach(function() {
        this.modalSpy = stubModals();
        this.task = new chorus.models.DataPreviewTask({
            checkId: "foo"
        });
        this.view = new chorus.views.ResultsConsole({ model: this.task });
    });

    describe("#render", function() {
        beforeEach(function() {
            this.view.render();
        });

        it("does not display the close link", function() {
            expect(this.view.$("a.close")).not.toExist();
        });

        it("does not display the resize area", function() {
            expect(this.view.$("a.minimize")).not.toExist();
            expect(this.view.$("a.maximize")).not.toExist();
        });

        it("does not display the executing spinner", function() {
            expect(this.view.$(".right")).not.toHaveClass("executing");
        });

        it("does not display save to csv file download link", function() {
            expect(this.view.$("a.download_csv")).not.toExist();
        });

        it("hides the bottom gutter", function() {
            expect(this.view.$(".bottom_gutter")).toHaveClass("hidden");
        });

        it("displays the default title", function() {
            expect(this.view.$("h1").text().trim()).toMatchTranslation("results_console_view.title");
        });

        context("with a title", function() {
            beforeEach(function() {
                this.view.options.titleKey = "test.mouse";
                this.view.render();
            });

            it("displays the supplied title", function() {
                expect(this.view.$("h1").text().trim()).toMatchTranslation("test.mouse");
            });
        });

        context("when the close button is enabled'", function() {
            beforeEach(function() {
                this.view.options.enableClose = true;
                this.view.render();
            });

            it("displays a close link", function() {
                expect(this.view.$("a.close")).toExist();
            });
        });

        context("when the resize area is enabled", function() {
            beforeEach(function() {
                this.view.options.enableResize = true;
                this.view.render();
            });

            it("hides the minimize and maximize links", function() {
                expect(this.view.$("a.minimize")).toHaveClass('hidden');
                expect(this.view.$("a.maximize")).toHaveClass('hidden');
            });
        });

        context("when the expander arrow should be hidden", function() {
            beforeEach(function() {
                this.view.options.enableExpander = false;
                this.view.render();
            });

            it("hides the expander", function() {
                expect(this.view.$(".expander_button")).not.toExist();
            });
        });

        describe("the default bounding container", function(){
            beforeEach(function () {
                this.windowHeight = 455;
                spyOn($.fn, 'height').andReturn(this.windowHeight);
                spyOn($.fn, 'offset').andReturn({top: 0});
            });

            it("incorporates the footerSize passed to the view as a function", function() {
                spyOn(this.view.boundingContainer, "footerSize").andReturn(5);

                var availableHeight = this.view.boundingContainer.getAvailableHeight();
                expect(availableHeight).toBe(this.windowHeight - 5);
            });

            it("incorporates the top offset", function() {
                $.fn.offset.andReturn({top: 7});

                var availableHeight = this.view.boundingContainer.getAvailableHeight();
                expect(availableHeight).toBe(this.windowHeight - 7);
            });

            it("incorporates the window.scrollTop", function() {
                spyOn($.fn, 'scrollTop').andReturn(11);

                var availableHeight = this.view.boundingContainer.getAvailableHeight();
                expect(availableHeight).toBe(this.windowHeight + 11);
            });

            it("takes into account the vertical padding passed into the view", function() {
                this.view.options.verticalDialogPosition = 2;

                var availableHeight = this.view.boundingContainer.getAvailableHeight();
                expect(availableHeight).toBe(this.windowHeight - 2);
            });

            it("takes into account the bottom gutter", function() {
                spyOn(this.view.boundingContainer, "bottomGutterHeight").andReturn(3);

                var availableHeight = this.view.boundingContainer.getAvailableHeight();
                expect(availableHeight).toBe(this.windowHeight - 3);
            });
        });
    });

    describe("event handling", function() {
        beforeEach(function() {
            this.view.options.enableResize = true;
            this.view.options.enableExpander = true;
            this.view.render();
        });

        describe("clicking the close link", function() {
            beforeEach(function() {
                this.view.options.enableClose = true;
                this.view.render();
                this.view.$(".controls").removeClass("hidden");

                spyOn(chorus.PageEvents, "trigger");
                this.view.$("a.close").click();
            });

            it("triggers action:closePreview", function() {
                expect(chorus.PageEvents.trigger).toHaveBeenCalledWith("action:closePreview");
            });

            it("hides the control section", function() {
                expect(this.view.$(".controls")).toHaveClass("hidden");
            });
        });

        describe("file:executionStarted", function() {
            function itRemovesExecutionUI(shouldCancelTimers) {
                it("removes the executing class", function() {
                    expect(this.view.$(".right")).not.toHaveClass("executing");
                });

                it("hides the spinner", function() {
                    expect(this.view.$(".spinner")).toHaveClass("hidden");
                    expect(this.view.$(".spinner").isLoading()).toBeFalsy();
                });

                if (shouldCancelTimers) {
                    it("stops updating the elapsed time", function() {
                        expect(window.clearInterval).toHaveBeenCalled();
                    });
                }

                it("clears timer ids", function() {
                    expect(this.view.elapsedTimer).toBeUndefined();
                });
            }

            function itCanExpandAndCollapseTheResults(tableShouldHaveClass, tableShouldNotHaveClass) {
                describe("clicking the expander arrow when it points up", function() {
                    beforeEach(function() {
                        this.view.$(".arrow").click();
                    });

                    it("collapses the result table", function() {
                        expect(this.view.$(".controls")).toHaveClass("collapsed");
                        expect(this.view.$('.result_table')).toHaveClass("collapsed");
                        expect(this.view.$('.result_table')).not.toHaveClass("minimized");
                        expect(this.view.$('.result_table')).not.toHaveClass("maximized");
                        expect(this.view.$('.data_grid').css("height")).toBe("0px");
                    });

                    it("makes the arrow point down", function() {
                        expect(this.view.$(".arrow")).not.toHaveClass("up");
                        expect(this.view.$(".arrow")).toHaveClass("down");
                        expect(this.view.$(".bottom_gutter")).not.toHaveClass("hidden");
                    });

                    it("hides the minimize/maximize links", function() {
                        expect(this.view.$("a.minimize")).toHaveClass("hidden");
                        expect(this.view.$("a.maximize")).toHaveClass("hidden");
                    });

                    describe("clicking the arrow when it points down", function() {
                        beforeEach(function() {
                            this.view.$(".arrow").click();
                        });
                        it("restores the result table", function() {
                            expect(this.view.$(".controls")).not.toHaveClass("collapsed");
                            expect(this.view.$('.result_table')).not.toHaveClass("collapsed");
                            expect(this.view.$('.result_table')).toHaveClass(tableShouldHaveClass);
                            expect(this.view.$('.result_table')).not.toHaveClass(tableShouldNotHaveClass);
                        });

                        it("makes the arrow point up", function() {
                            expect(this.view.$(".arrow")).toHaveClass("up");
                            expect(this.view.$(".arrow")).not.toHaveClass("down");
                            expect(this.view.$(".bottom_gutter")).not.toHaveClass("hidden");
                        });

                        it("restores the minimize/maximize link", function() {
                            var selector1 = "." + tableShouldHaveClass.slice(0, -1);
                            var selector2 = "." + tableShouldNotHaveClass.slice(0, -1);
                            expect(this.view.$(selector1)).toHaveClass("hidden");
                            expect(this.view.$(selector2)).not.toHaveClass("hidden");
                        });
                    });
                });
            }

            beforeEach(function() {
                unstubDelay();
                this.clock = this.useFakeTimers();
                spyOn(window, "clearInterval");
                spyOn(this.view, "closeError").andCallThrough();

                this.task.save();
                chorus.PageEvents.trigger("file:executionStarted");
            });

            it("sets the executing class", function() {
                expect(this.view.$(".right")).toHaveClass("executing");
            });

            it("hides the control section", function() {
                expect(this.view.$(".controls")).toHaveClass("hidden");
            });

            it("sets a delay to start a spinner", function() {
                expect(this.view.$(".spinner")).toHaveClass("hidden");
                this.clock.tick(300);
                expect(this.view.$(".spinner")).not.toHaveClass("hidden");
            });

            it("updates the time", function() {
                this.clock.tick(1000);
                expect(this.view.$(".elapsed_time").text().trim()).toMatchTranslation("results_console_view.elapsed", { sec: 1 });
                this.clock.tick(10000);
                expect(this.view.$(".elapsed_time").text().trim()).toMatchTranslation("results_console_view.elapsed", { sec: 11 });
            });

            it("shows the execution bar", function() {
                expect(this.view.$(".execution")).not.toHaveClass("hidden");
            });

            it("closes the errors", function() {
                expect(this.view.closeError).toHaveBeenCalled();
            });

            describe("cancelling the execution", function() {
                context("when the spinner has not yet been started", function() {
                    beforeEach(function() {
                        this.view.$(".cancel").click();
                        chorus.PageEvents.trigger("file:executionFailed");
                    });

                    it("cancels the execution", function() {
                        var destroy = this.server.lastDestroy();
                        expect(destroy).toBeDefined();
                    });

                    itRemovesExecutionUI(true);
                });

                context("when the spinner has been started", function() {
                    beforeEach(function() {
                        delete this.view.elapsedTimer;
                        this.view.$(".cancel").click();
                        chorus.PageEvents.trigger("file:executionFailed");
                    });

                    it("cancels the execution", function() {
                        var destroy = this.server.lastDestroy();
                        expect(destroy).toBeDefined();
                    });

                    itRemovesExecutionUI(false);
                });
            });

            describe("when the execution is completed", function() {
                context("and there are results", function() {
                    beforeEach(function() {
                        this.server.completeCreateFor(this.task, backboneFixtures.workfileExecutionResults());
                        chorus.PageEvents.trigger("file:executionSucceeded", this.task);
                    });

                    it("renders a data grid with the given task", function() {
                        expect(this.view.dataGrid).toBeA(chorus.views.DataGrid);
                        expect(this.view.dataGrid.model).toBe(this.task);
                        expect($(this.view.el)).toContain(this.view.dataGrid.el);
                    });

                    it("displays the result table with one data table", function() {
                        expect(this.view.$('.result_table')).not.toHaveClass("hidden");
                        expect(this.view.$(".result_table .data_grid").length).toBe(1);
                    });

                    it("shows the control section", function() {
                        expect(this.view.$(".controls")).not.toHaveClass("hidden");
                    });

                    context("when another execution completed event occurs", function() {
                        beforeEach(function() {
                            chorus.PageEvents.trigger("file:executionSucceeded", backboneFixtures.workfileExecutionResults());
                        });

                        it("still renders only one data table", function() {
                            expect(this.view.$(".result_table .data_grid").length).toBe(1);
                        });
                    });

                    it("changes the state of the result table to 'minimized'", function() {
                        expect(this.view.$('.result_table')).not.toHaveClass("collapsed");
                        expect(this.view.$('.result_table')).toHaveClass("minimized");
                        expect(this.view.$('.result_table')).not.toHaveClass("maximized");
                    });

                    it("renders the maximize link", function() {
                        expect(this.view.$("a.maximize")).not.toHaveClass("hidden");
                        expect(this.view.$("a.minimize")).toHaveClass("hidden");
                    });

                    it("shows the bottom gutter (with the expander button)", function() {
                        expect(this.view.$(".bottom_gutter")).not.toHaveClass("hidden");
                    });

                    specify("the expander button arrow points up", function() {
                        expect(this.view.$(".arrow")).toHaveClass("up");
                        expect(this.view.$(".arrow")).not.toHaveClass("down");
                    });

                    describe("clicking the maximize link", function() {
                        beforeEach(function() {
                            spyOn(this.view.dataGrid, 'resizeGridToResultsConsole');
                            spyOn(this.view, "getDesiredDataGridHeight").andReturn(777);
                            spyOn(this.view, "recalculateScrolling");
                            this.view.$("a.maximize").click();
                        });

                        it("hides the maximize link and shows the minimize link", function() {
                            expect(this.view.$("a.maximize")).toHaveClass("hidden");
                            expect(this.view.$("a.minimize")).not.toHaveClass("hidden");
                        });

                        it("changes the state of the result table to 'minimized'", function() {
                            expect(this.view.$('.result_table')).not.toHaveClass("collapsed");
                            expect(this.view.$('.result_table')).not.toHaveClass("minimized");
                            expect(this.view.$('.result_table')).toHaveClass("maximized");
                        });

                        it("recalculates scrolling", function() {
                            expect(this.view.recalculateScrolling).toHaveBeenCalled();
                        });

                        it("the expander button arrow points up", function() {
                            expect(this.view.$(".arrow")).toHaveClass("up");
                            expect(this.view.$(".arrow")).not.toHaveClass("down");
                        });

                        it("sets .data_grid height to use the full viewport", function() {
                            expect(this.view.$(".data_grid").css("height")).toBe("777px");
                        });

                        it("resizes the data grid", function() {
                            expect(this.view.dataGrid.resizeGridToResultsConsole).toHaveBeenCalled();
                        });

                        itCanExpandAndCollapseTheResults("maximized", "minimized");

                        describe("clicking the minimize link", function() {
                            beforeEach(function() {
                                this.view.dataGrid.resizeGridToResultsConsole.reset();
                                this.view.recalculateScrolling.reset();
                                this.view.$("a.minimize").click();
                            });

                            it("hides the minimize link and shows the maximize link", function() {
                                expect(this.view.$("a.minimize")).toHaveClass("hidden");
                                expect(this.view.$("a.maximize")).not.toHaveClass("hidden");
                            });

                            it("changes the state of the result table to 'minimized'", function() {
                                expect(this.view.$('.result_table')).not.toHaveClass("collapsed");
                                expect(this.view.$('.result_table')).toHaveClass("minimized");
                                expect(this.view.$('.result_table')).not.toHaveClass("maximized");
                            });

                            it("recalculates scrolling", function() {
                                expect(this.view.recalculateScrolling).toHaveBeenCalled();
                            });

                            it("the expander button arrow points up", function() {
                                expect(this.view.$(".arrow")).toHaveClass("up");
                                expect(this.view.$(".arrow")).not.toHaveClass("down");
                            });

                            it("does not keep the maxmized height", function() {
                                expect(this.view.$(".data_grid").css("height")).not.toBe("777px");
                            });

                            it("resizes the data grid", function() {
                                expect(this.view.dataGrid.resizeGridToResultsConsole).toHaveBeenCalled();
                            });
                        });
                    });

                    describe("getDesiredDataGridHeight", function() {
                        beforeEach(function() {
                            this.arbitrarySpacing = 2; // to eliminate alleged spurious y-scrollbar
                            this.availableHeight = 300 - this.arbitrarySpacing;
                            spyOn(this.view.boundingContainer, 'getAvailableHeight').andReturn(this.availableHeight + this.arbitrarySpacing);
                        });

                        it("doesn't expand past the available height of its bounding container", function () {
                            expect(this.view.getDesiredDataGridHeight()).toBe(this.availableHeight);
                        });
                    });

                    describe("clicking the download link", function() {
                        context("with the show download dialog option", function() {
                            beforeEach(function() {
                                spyOn(chorus, "fileDownload");
                                this.view.showDownloadDialog = true;
                                this.view.dataset = backboneFixtures.dataset();
                                this.view.$("a.download_csv").click();
                            });

                            itBehavesLike.aDialogLauncher("a.download_csv", chorus.dialogs.DatasetDownload);

                            it("should not have called $.fileDownload", function() {
                                expect(chorus.fileDownload).not.toHaveBeenCalled();
                            });
                        });

                        context("without the show download dialog option", function() {
                            beforeEach(function() {
                                spyOn(chorus, "fileDownload");
                                this.view.showDownloadDialog = false;
                                this.view.$("a.download_csv").click();
                            });

                            it("starts the file download", function() {
                                var content = new chorus.utilities.CsvWriter(
                                    _.pluck(this.view.resource.getColumns(), "name"),
                                    _.pluck(this.view.resource.getColumns(), "uniqueName"),
                                    this.view.resource.getRows()
                                ).toCsv();
                                expect(chorus.fileDownload).toHaveBeenCalledWith("/download_data",
                                    {
                                        data: {
                                            content: content,
                                            filename: this.view.resource.name()+'.csv',
                                            mime_type: "text/csv"
                                        },
                                        httpMethod: "POST"
                                    });
                            });
                        });
                    });

                    it("has a link to display the execution message", function() {
                        expect(this.view.$(".execution .view_details").text()).toMatchTranslation("actions.view_details");
                    });

                    describe("clicking the execution view details link", function() {
                        it("launches an execution message alert", function() {
                            this.view.$(".execution a.view_details").click();

                            var alert = this.modalSpy.lastModal();
                            expect(alert).toBeA(chorus.alerts.ExecutionMessage);
                            expect($(alert.el)).toContainTranslation('sql_execution.success');
                        });
                    });

                    describe("starting another execution", function() {
                        beforeEach(function() {
                            chorus.PageEvents.trigger("file:executionStarted", this.task);
                        });

                        it("hides the control section", function() {
                            expect(this.view.$(".controls")).toHaveClass("hidden");
                        });
                    });
                });

                context("and the task does not have results", function() {
                    beforeEach(function() {
                        this.server.completeCreateFor(this.task, backboneFixtures.workfileExecutionResultsEmpty());
                        chorus.PageEvents.trigger("file:executionSucceeded", this.task);
                    });

                    it("collapses the result table", function() {
                        expect(this.view.$(".controls")).toHaveClass("collapsed");
                        expect(this.view.$('.result_table')).toHaveClass("collapsed");
                        expect(this.view.$('.result_table')).not.toHaveClass("minimized");
                        expect(this.view.$('.result_table')).not.toHaveClass("maximized");
                        expect(this.view.$('.data_grid').css("height")).toBe("0px");
                    });

                    it("does not have a download link", function() {
                        expect(this.view.$('.download_csv')).not.toExist();
                    });
                });

                context("when the spinner has not yet been started", function() {
                    beforeEach(function() {
                        this.server.completeCreateFor(this.task, backboneFixtures.workfileExecutionResults());
                        chorus.PageEvents.trigger("file:executionSucceeded", this.task);
                    });

                    itRemovesExecutionUI(true);
                });

                context("when the spinner has been started", function() {
                    beforeEach(function() {
                        delete this.view.elapsedTimer;
                        this.server.completeCreateFor(this.task, backboneFixtures.workfileExecutionResults());
                        chorus.PageEvents.trigger("file:executionSucceeded", this.task);
                    });

                    itRemovesExecutionUI(false);
                });

                context("and there was an execution error", function() {
                    beforeEach(function() {
                        this.server.lastCreateFor(this.task).failUnprocessableEntity(backboneFixtures.workfileExecutionErrorJson()['errors']);
                        chorus.PageEvents.trigger("file:executionFailed", this.task);
                    });

                    it("should show the error header", function() {
                        expect(this.view.$('.sql_errors')).not.toHaveClass('hidden');
                    });

                    it("should show 'View Details' link", function() {
                        expect(this.view.$('.sql_errors .view_details')).toExist();
                    });

// TODO: delete when final
//                     it("should show 'Close' link", function() {
//                         expect(this.view.$('.sql_errors .close_errors')).toExist();
//                     });
                    
                    it("should hide the execution content area", function() {
                        expect(this.view.$(".result_table")).toHaveClass("hidden");
                        expect(this.view.$(".bottom_gutter")).toHaveClass("hidden");
                        expect(this.view.$(".execution")).toHaveClass("hidden");
                    });

                    describe("clicking on the close button", function() {
                        beforeEach(function() {
                            spyOn(chorus.PageEvents, "trigger");
                            this.view.$(".close_errors").click();
                        });

                        it("triggers action:closePreview", function() {
                            expect(chorus.PageEvents.trigger).toHaveBeenCalledWith("action:closePreview");
                        });

                        it("hides the control section", function() {
                            expect(this.view.$(".controls")).toHaveClass("hidden");
                        });

                        it("should hide the sql_errors content", function() {
                            expect(this.view.$(".sql_errors")).toHaveClass("hidden");
                        });
                    });

                    context("when the sql is executed again without errors", function() {
                        beforeEach(function() {
                            this.server.completeCreateFor(this.task, backboneFixtures.workfileExecutionResults());
                            chorus.PageEvents.trigger("file:executionSucceeded", this.task);
                        });

                        it("should show the data table", function() {
                            expect(this.view.$(".result_table")).not.toHaveClass("hidden");
                            expect(this.view.$(".bottom_gutter")).not.toHaveClass("hidden");
                        });
                    });

                    describe("clicking on view details", function() {
                        it("should open an execution message alert", function() {
                            this.view.$(".view_details").click();
                            expect(this.modalSpy).toHaveModal(chorus.alerts.ExecutionError);
                        });
                    });
                });

                describe("starting another execution", function() {
                    beforeEach(function() {
                        this.task = new chorus.models.DataPreviewTask({});
                        this.view.execute(this.task);
                        chorus.PageEvents.trigger("file:executionSucceeded", this.task);
                        chorus.PageEvents.trigger("file:executionStarted");
                    });

                    it("hides the gutter", function() {
                        expect(this.view.$(".bottom_gutter")).toHaveClass("hidden");
                    });

                    it("clears out any data that is already in the table", function() {
                        expect(this.view.$(".result_table")).toHaveHtml("");
                    });
                });
            });
        });

        describe("#teardown", function() {
            beforeEach(function() {
                spyOn(this.task, "cancel").andCallThrough();
                this.view.teardown();
            });

            it("cancels the task", function() {
                expect(this.task.cancel).toHaveBeenCalled();
            });
        });
    });

    describe("#execute", function() {
        beforeEach(function() {
            this.executionModel = new chorus.models.Task();
            spyOn(this.executionModel, 'url').andReturn('super_great_thing');
            spyOn(this.view, 'executionStarted');
            spyOn(this.view, 'executionSucceeded');
            spyOn(this.view, 'executionFailed');
            spyOn(this.executionModel, 'save').andCallThrough();
            this.view.execute(this.executionModel);
            this.view.render();
        });

        it("saves the executionModel", function() {
            expect(this.executionModel.save).toHaveBeenCalled();
        });

        it("calls executionStarted", function() {
            expect(this.view.executionStarted).toHaveBeenCalled();
        });

        context("when the task was successfully executed previously", function() {
            beforeEach(function() {
                this.task = backboneFixtures.workfileExecutionResults();
                this.task.loaded = true;
                this.view.execute(this.task);
            });

            it("does not show the data table", function() {
                expect(this.view.executionSucceeded).not.toHaveBeenCalled();
            });
        });

        context("when execution is successful", function() {
            context("when save request returns successfully", function() {
                beforeEach(function() {
                    this.view.model.trigger("saved");
                });

                it("calls executionSucceeded", function() {
                    expect(this.view.executionSucceeded).toHaveBeenCalledWith(this.executionModel);
                });
            });
        });

        context("when execution fails", function() {
            beforeEach(function() {
                this.server.lastCreateFor(this.executionModel).failUnprocessableEntity({ fields: { a: { BLANK: {} } } });
            });

            it("calls executionFailed", function() {
                expect(this.view.executionFailed).toHaveBeenCalled();
                expect(this.view.executionFailed.lastCall().args[0]).toBe(this.executionModel);
            });
        });

        context("when file:executionCancelled event is trigger", function() {
            beforeEach(function() {
                chorus.PageEvents.trigger('file:executionCancelled');
            });

            it("stops the spinner", function() {
                expect(this.view.$('.spinner')).toHaveClass('hidden');
            });
        });
    });
});
