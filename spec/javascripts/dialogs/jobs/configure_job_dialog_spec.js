describe("chorus.dialogs.ConfigureJob", function () {
    beforeEach(function () {
        this.modalSpy = stubModals();

        this.jobPlan = {
            name: 'Apples',
            interval_value: '2',
            interval_unit: 'weeks',
            month: "7",
            day: "9",
            year: "3013",
            hour: '1',
            minute: '5',
            meridiem: 'am',
            time_zone: 'American Samoa'
        };

        this.workspace = backboneFixtures.workspace();

        spyOn(chorus.router, "navigate");

        this.dialog = new chorus.dialogs.ConfigureJob({pageModel: this.workspace});
        spyOn(this.dialog.endDatePicker, "disable");
        this.dialog.render();
    });

    it("has all the dialog pieces", function () {
        expect(this.dialog.title()).toMatchTranslation("job.dialog.title");
        expect(this.dialog.$('button.submit').text()).toMatchTranslation("job.dialog.submit");
        expect(this.dialog.$('button.cancel').text()).toMatchTranslation("actions.cancel");
    });

    context("creating a Job that runs On Demand", function () {
        beforeEach(function () {
            this.jobPlan.interval_unit = 'on_demand';
        });

        it("leaves scheduling options hidden", function () {
            expect(this.dialog.$('.interval_options')).toHaveClass('hidden');
        });

        context("with valid field values", function () {
            beforeEach(function () {
                this.dialog.$('input.name').val(this.jobPlan.name).trigger("keyup");
            });

            it("should enable the submit button", function () {
                expect(this.dialog.$('button.submit')).toBeEnabled();
            });

            describe("submitting the form", function () {
                beforeEach(function () {
                    this.dialog.$("form").submit();
                });

                it("posts the form elements to the API", function () {
                    var postUrl = this.server.lastCreateFor(this.dialog.model).url;
                    expect(postUrl).toContain("/workspaces/" + this.workspace.id + "/jobs");
                });

                it("posts with the correct values", function() {
                    var json = this.server.lastCreate().json()['job'];
                    expect(json['name']).toEqual(this.jobPlan.name);
                    expect(json['interval_unit']).toEqual(this.jobPlan.interval_unit);
                    expect(json['interval_value']).toEqual("0");
                });

                context("when the save fails", function () {
                    beforeEach(function () {
                        this.server.lastCreateFor(this.dialog.model).failUnprocessableEntity({
                            fields: {
                                BASE: { SOME_FAKE_ERROR: {}}
                            }
                        });
                    });

                    it("should display the errors for the model", function() {
                        expect(this.dialog.$(".errors li")).toExist();
                    });
                });

                context("when the save succeeds", function () {
                    beforeEach(function () {
                        spyOn(this.dialog, "closeModal");
                        spyOn(chorus, "toast");
                        this.server.lastCreate().succeed();
                    });

                    it("it should close the modal", function () {
                        expect(this.dialog.closeModal).toHaveBeenCalled();
                    });

                    it("should create a toast", function () {
                        expect(chorus.toast).toHaveBeenCalledWith(this.dialog.message());
                    });

                    it("should navigate to the job's show page", function () {
                        expect(chorus.router.navigate).toHaveBeenCalledWith(this.dialog.model.showUrl());
                    });
                });
            });
        });

        context("with invalid field values", function () {
            it("leaves the form disabled", function () {
                expect(this.dialog.$('button.submit')).toBeDisabled();
            });
        });
    });

    context("creating a Job that runs on schedule", function () {
        describe("selecting 'on schedule'", function () {
            beforeEach(function () {
                this.dialog.$('input:radio#onScheduleField').prop("checked", true).trigger('change');
                this.dialog.$('input:radio#onDemandField').prop("checked", false).trigger('change');
            });

            it("should show schedule options", function () {
                expect(this.dialog.$('.interval_options')).not.toHaveClass('hidden');
            });

            it("should have a select with hours, days, weeks, months as options", function() {
                expect(this.dialog.$(".interval_unit option[value=hours]")).toContainTranslation("job.interval_unit.hours");
                expect(this.dialog.$(".interval_unit option[value=days]")).toContainTranslation("job.interval_unit.days");
                expect(this.dialog.$(".interval_unit option[value=weeks]")).toContainTranslation("job.interval_unit.weeks");
                expect(this.dialog.$(".interval_unit option[value=months]")).toContainTranslation("job.interval_unit.months");
                expect(this.dialog.$(".interval_unit").val()).toBe("hours");
            });

            it("should show the start date controls", function() {
                expect(this.dialog.$(".start_date_widget")).toExist();
            });

            it("should show the end date controls", function () {
                expect(this.dialog.$(".end_date_widget")).toExist();
            });

            describe("changing the next run date then opening and closing the recipients dialog", function () {
                beforeEach(function () {
                    this.dialog.$(".start_date > input.day").val("14");
                    this.dialog.launchSuccessRecipientSelectionDialog();
                    this.dialog.render();
                });

                it("should maintain the changed date", function() {
                    expect(this.dialog.$(".start_date > input.day").val()).toBe("14");
                });

            });

            describe("selected time zone", function () {
                it("should be the first timezone that matches the browser's current offset according to jstz", function () {
                    chorus.models.Config.instance().set("timeZones", backboneFixtures.config().get('timeZones'));
                    spyOn(jstz, 'determine').andReturn({
                        name: function () {
                            return 'Asia/Kolkata';
                        }
                    });
                    this.dialog.render();
                    expect(this.dialog.$('select.time_zone').val()).toBe('Chennai');
                });
            });
        });

        context("with valid field values", function () {
            beforeEach(function () {
                this.dialog.$('input:radio#onScheduleField').prop("checked", true).trigger("change");
                this.dialog.$('input:radio#onDemandField').prop("checked", false).trigger("change");
                var dialog = this.dialog;
                var jobPlan = this.jobPlan;
                _.each(_.keys(this.jobPlan), function (prop) {
                    var selects = ['interval_unit', 'meridiem', 'hour', 'minute', 'time_zone'];
                    var element = (_.contains(selects, prop) ? 'select.' : 'input.');
                    dialog.$(element + prop).val(jobPlan[prop]).trigger("change").trigger("keyup");
                });
            });

            it("should enable the submit button", function () {
                expect(this.dialog.$('button.submit')).toBeEnabled();
            });

            context("with no end run", function () {
                it("should disable the end date widget", function () {
                    expect(this.dialog.endDatePicker.disable).toHaveBeenCalled();
                });

                describe("submitting the form", function () {
                    beforeEach(function () {
                        this.dialog.$("form").submit();
                    });

                    it("posts the form elements to the API", function () {
                        var postUrl = this.server.lastCreateFor(this.dialog.model).url;
                        expect(postUrl).toContain("/workspaces/" + this.workspace.id + "/jobs");
                    });

                    it("posts with the correct values", function() {
                        var json = this.server.lastCreate().json()['job'];
                        var date = moment.utc([this.jobPlan.year, parseInt(this.jobPlan.month, 10) - 1, this.jobPlan.day, parseInt(this.jobPlan.hour, 10), parseInt(this.jobPlan.minute, 10)]);
                        expect(json['name']).toEqual(this.jobPlan.name);
                        expect(json['interval_unit']).toEqual(this.jobPlan.interval_unit);
                        expect(json['interval_value']).toEqual(this.jobPlan.interval_value);
                        expect(json['next_run']).toEqual(date.format());
                        expect(json['end_run']).toEqual(false);
                    });

                    context("when the save succeeds", function () {
                        beforeEach(function () {
                            spyOn(this.dialog, "closeModal");
                            spyOn(chorus, "toast");
                            this.server.lastCreate().succeed();
                        });

                        it("it should close the modal", function () {
                            expect(this.dialog.closeModal).toHaveBeenCalled();
                        });

                        it("should create a toast", function () {
                            expect(chorus.toast).toHaveBeenCalledWith(this.dialog.message());
                        });

                        it("should navigate to the job's show page", function () {
                            expect(chorus.router.navigate).toHaveBeenCalledWith(this.dialog.model.showUrl());
                        });
                    });

                    context('when the save fails', function () {
                        beforeEach(function() {
                            spyOn(this.dialog, "closeModal");
                            this.server.lastCreate().fail();
                        });

                        it("does not close the dialog box", function() {
                            expect(this.dialog.closeModal).not.toHaveBeenCalled();
                        });

                        it("removes the spinner from the button", function() {
                            expect(this.dialog.$("button.submit").isLoading()).toBeFalsy();
                        });
                    });
                });
            });

            context("with an end run", function () {
                beforeEach(function () {
                    spyOn(this.dialog.endDatePicker, "enable");
                    this.dialog.$(".end_date_enabled").prop("checked", "checked").trigger("change");
                });

                it("should enable the end date widget", function () {
                    expect(this.dialog.endDatePicker.enable).toHaveBeenCalled();
                });

                describe("changing the end run date then opening and closing the recipients dialog", function () {
                    beforeEach(function () {
                        this.dialog.$(".end_date > input.day").val("14");
                        this.dialog.launchFailureRecipientSelectionDialog();
                        this.dialog.render();
                    });

                    it("should maintain the changed date", function() {
                        expect(this.dialog.$(".end_date > input.day").val()).toBe("14");
                    });

                });

                describe("submitting the form", function () {
                    beforeEach(function () {
                        this.dialog.$("form").submit();
                    });

                    it("posts the form elements to the API", function () {
                        var postUrl = this.server.lastCreateFor(this.dialog.model).url;
                        expect(postUrl).toContain("/workspaces/" + this.workspace.id + "/jobs");
                    });

                    it("posts with the correct values", function() {
                        var json = this.server.lastCreate().json()['job'];
                        var date = moment.utc([this.jobPlan.year, parseInt(this.jobPlan.month, 10) - 1, this.jobPlan.day, parseInt(this.jobPlan.hour, 10), parseInt(this.jobPlan.minute, 10)]);
                        var endDate = moment(new Date(this.jobPlan.year, parseInt(this.jobPlan.month, 10) - 1, this.jobPlan.day));
                        expect(json['name']).toEqual(this.jobPlan.name);
                        expect(json['interval_unit']).toEqual(this.jobPlan.interval_unit);
                        expect(json['interval_value']).toEqual(this.jobPlan.interval_value);
                        expect(json['next_run']).toEqual(date.format());
                        expect(json['end_run']).toEqual(endDate.toISOString());
                    });

                    context("when the save succeeds", function () {
                        beforeEach(function () {
                            spyOn(this.dialog, "closeModal");
                            spyOn(chorus, "toast");
                            this.server.lastCreate().succeed();
                        });

                        it("it should close the modal", function () {
                            expect(this.dialog.closeModal).toHaveBeenCalled();
                        });

                        it("should create a toast", function () {
                            expect(chorus.toast).toHaveBeenCalledWith(this.dialog.message());
                        });

                        it("should navigate to the job's show page", function () {
                            expect(chorus.router.navigate).toHaveBeenCalledWith(this.dialog.model.showUrl());
                        });
                    });
                });
            });
        });

        context("with invalid field values", function () {
            beforeEach(function () {
                this.dialog.$('input.interval_value').val('').trigger("keyup");
            });

            it("leaves the form disabled", function () {
                expect(this.dialog.$('button.submit')).toBeDisabled();
            });
        });
    });

    describe("editing an existing Job", function () {
        beforeEach(function () {
            this.job = backboneFixtures.job();
            this.workspace = this.job.get("workspace");

            chorus.models.Config.instance().set("timeZones", [
                ['Other Time Zone', 'Pacific'],
                ['American Samoa is Fun!', 'American Samoa']
            ]);

            this.dialog = new chorus.dialogs.ConfigureJob({model: this.job});
            spyOn(this.dialog.endDatePicker, "enable");
            this.dialog.render();
        });

        describe("prepopulating the dialog with the job's attributes", function () {
            it("populates name", function () {
                expect(this.dialog.$("input.name").val()).toBe(this.job.get("name"));
            });

            it("populates intervalValue and itnervalUnit", function () {
                expect(this.dialog.$("input.interval_value").val()).toBe(this.job.get("intervalValue").toString());
                expect(this.dialog.$("select.interval_unit").val()).toBe(this.job.get("intervalUnit"));
            });

            it("populates next run date", function () {
                var nextRunDate = this.job.nextRunDate().startOf("minute");
                nextRunDate.minute(nextRunDate.minute());
                expect(this.dialog.buildStartDate().format("YYYY-MM-DDTHH:mm")).toEqual(nextRunDate.format("YYYY-MM-DDTHH:mm"));
            });

            it("populates end date", function () {
                var endRunDate = this.job.endRunDate().startOf("day");

                expect(this.dialog.buildEndDate().format("YYYY-MM-DD")).toEqual(endRunDate.format("YYYY-MM-DD"));
            });

            it("populates time zone", function () {
                this.dialog.model.set("nextRun", "2013-07-29T08:00:00-11:00");
                this.dialog.model.set("timeZone", "American Samoa");
                this.dialog.render();
                expect(this.dialog.$('select.time_zone').val()).toEqual("American Samoa");
            });

        });

        context("editing a Job that runs on schedule with an end run time", function () {
            describe("selecting 'on schedule'", function () {

                it("should show schedule options", function () {
                    expect(this.dialog.$('.interval_options')).not.toHaveClass('hidden');
                });

                it("should have a select with hours, days, weeks, months as options", function () {
                    expect(this.dialog.$(".interval_unit option[value=hours]")).toContainTranslation("job.interval_unit.hours");
                    expect(this.dialog.$(".interval_unit option[value=days]")).toContainTranslation("job.interval_unit.days");
                    expect(this.dialog.$(".interval_unit option[value=weeks]")).toContainTranslation("job.interval_unit.weeks");
                    expect(this.dialog.$(".interval_unit option[value=months]")).toContainTranslation("job.interval_unit.months");
                });

                it("should show the start date controls", function () {
                    expect(this.dialog.$(".start_date_widget")).toExist();
                });

                it("should show the end date controls", function () {
                    expect(this.dialog.$(".end_date_widget")).toExist();
                });
            });

            context("with valid field values", function () {
                beforeEach(function () {
                    this.dialog.$('input:radio#onScheduleField').prop("checked", true).trigger("change");
                    this.dialog.$('input:radio#onDemandField').prop("checked", false).trigger("change");
                    var dialog = this.dialog;
                    var jobPlan = this.jobPlan;
                    _.each(_.keys(this.jobPlan), function (prop) {
                        var selects = ['interval_unit', 'meridiem', 'hour', 'minute', 'time_zone'];
                        var element = (_.contains(selects, prop) ? 'select.' : 'input.');
                        dialog.$(element + prop).val(jobPlan[prop]).trigger("change").trigger("keyup");
                    });
                });

                it("should enable the submit button", function () {
                    expect(this.dialog.$('button.submit')).toBeEnabled();
                });

                it("should enable the end date widget", function () {
                    expect(this.dialog.endDatePicker.enable).toHaveBeenCalled();
                });

                describe("submitting the form", function () {
                    beforeEach(function () {
                        this.dialog.$("form").submit();
                    });

                    it("posts the form elements to the API", function () {
                        var postUrl = this.server.lastUpdateFor(this.dialog.model).url;
                        expect(postUrl).toContain("/workspaces/" + this.workspace.id + "/jobs/" + this.job.id);
                    });

                    it("posts with the correct values", function () {
                        var json = this.server.lastUpdate().json()['job'];
                        var date = moment.utc([this.jobPlan.year, parseInt(this.jobPlan.month, 10) - 1, this.jobPlan.day, parseInt(this.jobPlan.hour, 10), parseInt(this.jobPlan.minute, 10)]);
                        var endDate = moment(new Date(this.jobPlan.year, parseInt(this.jobPlan.month, 10) - 1, this.jobPlan.day));
                        expect(json['name']).toEqual(this.jobPlan.name);
                        expect(json['interval_unit']).toEqual(this.jobPlan.interval_unit);
                        expect(json['interval_value']).toEqual(this.jobPlan.interval_value);
                        expect(json['next_run']).toEqual(date.format());
                        expect(json['end_run']).toEqual(endDate.toISOString());
                        expect(json['time_zone']).toEqual(this.jobPlan.time_zone);
                    });

                    context("when the save succeeds", function () {
                        beforeEach(function () {
                            spyOn(this.dialog, "closeModal");
                            spyOn(chorus, "toast");
                            this.server.lastUpdate().succeed();
                        });

                        it("it should close the modal", function () {
                            expect(this.dialog.closeModal).toHaveBeenCalled();
                        });

                        it("should create a toast", function () {
                            expect(chorus.toast).toHaveBeenCalledWith(this.dialog.message());
                        });
                    });
                });
            });

            context("with invalid field values", function () {
                beforeEach(function () {
                    this.dialog.$('input.interval_value').val('').trigger("keyup");
                });

                it("leaves the form disabled", function () {
                    expect(this.dialog.$('button.submit')).toBeDisabled();
                });
            });

            context("when switching it to onDemand", function () {
                beforeEach(function () {
                    this.dialog.$('input:radio#onScheduleField').prop("checked", false).trigger("change");
                    this.dialog.$('input:radio#onDemandField').prop("checked", true).trigger("change");
                });

                it("should enable the submit button", function () {
                    expect(this.dialog.$('button.submit')).toBeEnabled();
                });

                it("should hide the interval options", function () {
                    expect(this.dialog.$(".interval_options")).toHaveClass("hidden");
                });

                describe("submitting the form", function () {
                    beforeEach(function () {
                        this.dialog.$("form").submit();
                    });

                    it("posts the form elements to the API", function () {
                        var postUrl = this.server.lastUpdateFor(this.dialog.model).url;
                        expect(postUrl).toContain("/workspaces/" + this.workspace.id + "/jobs/" + this.job.id);
                    });

                    it("posts with the correct values", function () {
                        var json = this.server.lastUpdate().json()['job'];
                        expect(json['name']).toEqual(this.job.get("name"));
                        expect(json['interval_unit']).toEqual("on_demand");
                        expect(json['interval_value']).toEqual("0");
                        expect(json['next_run']).toBe(false);
                        expect(json['end_run']).toBe(false);
                    });

                    context("when the save succeeds", function () {
                        beforeEach(function () {
                            spyOn(this.dialog, "closeModal");
                            spyOn(chorus, "toast");
                            this.server.lastUpdate().succeed();
                        });

                        it("it should close the modal", function () {
                            expect(this.dialog.closeModal).toHaveBeenCalled();
                        });

                        it("should create a toast", function () {
                            expect(chorus.toast).toHaveBeenCalledWith(this.dialog.message());
                        });
                    });
                });
            });
        });
    });

    describe("notifications", function () {
        it("initially selects 'nobody' for success and failure and has no links", function () {
            expect(this.dialog.$('[name="success_notify"]:checked').val()).toEqual('nobody');
            expect(this.dialog.$('[name="failure_notify"]:checked').val()).toEqual('nobody');

            expect(this.dialog.$("span.select_success_recipients")).not.toHaveClass('hidden');
            expect(this.dialog.$("span.select_failure_recipients")).not.toHaveClass('hidden');
            expect(this.dialog.$("a.select_success_recipients")).toHaveClass('hidden');
            expect(this.dialog.$("a.select_failure_recipients")).toHaveClass('hidden');

            expect(this.dialog.$("span.select_failure_recipients").text()).toMatchTranslation('job.dialog.edit.notify.recipients_not_selected');
            expect(this.dialog.$("span.select_success_recipients").text()).toMatchTranslation('job.dialog.edit.notify.recipients_not_selected');
        });

        it("on submit, sends the values of the notification options to the server", function () {
            this.dialog.$('input.name').val(this.jobPlan.name).trigger("keyup");
            this.dialog.$("form").submit();

            var json = this.server.lastCreate().json()['job'];
            expect(json['success_notify']).toEqual("nobody");
            expect(json['failure_notify']).toEqual("nobody");
        });

        describe("when opened with a model that already has success/failure set", function () {
            beforeEach(function () {
                this.job = backboneFixtures.job();
                this.job.set('successNotify', 'everybody');
                this.job.set('failureNotify', 'selected');

                this.dialog = new chorus.dialogs.ConfigureJob({model: this.job});
                this.dialog.render();
            });

            it("checks the correct radio buttons", function () {
                expect(this.dialog.$('[name="success_notify"]:checked').val()).toEqual('everybody');
                expect(this.dialog.$('[name="failure_notify"]:checked').val()).toEqual('selected');
            });
        });

        context("when 'select recipients' is checked", function () {
            function selectRecipientsForCondition (condition, recipientIds) {
                this.dialog.$('a.select_' + condition + '_recipients').click();
                var picker = _.last(this.modalSpy.modals());
                spyOn(picker.shuttle, 'getSelectedIDs').andReturn(recipientIds);
                picker.$('button.submit').click();
            }

            beforeEach(function () {
                this.dialog.$("input:radio[name='success_notify']").val('selected').trigger('change');
                this.dialog.$("input:radio[name='failure_notify']").val('selected').trigger('change');
            });

            it("activates the link", function () {
                expect(this.dialog.$("span.select_success_recipients")).toHaveClass('hidden');
                expect(this.dialog.$("span.select_failure_recipients")).toHaveClass('hidden');
                expect(this.dialog.$("a.select_success_recipients")).not.toHaveClass('hidden');
                expect(this.dialog.$("a.select_failure_recipients")).not.toHaveClass('hidden');
            });

            describe("validation", function () {
                beforeEach(function () {
                    this.dialog.$('input.name').val('Hello, Job!').trigger('keyup');
                });

                it("disables the 'create' button until recipients are selected", function () {
                    expect(this.dialog.$('button.submit')).toBeDisabled();

                    selectRecipientsForCondition.call(this, 'success', ['1','2','3']);
                    selectRecipientsForCondition.call(this, 'failure', ['1','2','3']);

                    expect(this.dialog.$('button.submit')).toBeEnabled();
                });
            });

            it("displays a link with a count of chosen recipients", function () {
                this.dialog.model.set('successRecipients', [backboneFixtures.user().get('id'), backboneFixtures.user().get('id')]);
                this.dialog.render();
                expect(this.dialog.$("a.select_success_recipients").text()).toMatchTranslation('job.dialog.edit.notify.recipients_selected', {count: 2});
                expect(this.dialog.$("a.select_failure_recipients").text()).toMatchTranslation('job.dialog.edit.notify.recipients_selected', {count: 0});
            });

            it("keeps the old form values when rerendering after new recipients are selected", function () {
                this.dialog.$('input.name').val(this.jobPlan.name);

                selectRecipientsForCondition.call(this, 'success', ['1','2','3']);

                expect(this.dialog.$('input.name').val()).toEqual(this.jobPlan.name);
            });

            describe("submitting the form", function () {
                beforeEach(function () {
                    this.dialog.$('input.name').val('Hello, Job!').trigger('keyup');
                    this.dialog.$("input:radio[name='success_notify']").val('selected').trigger('change');
                    selectRecipientsForCondition.call(this, 'success', ['3', '4']);
                    selectRecipientsForCondition.call(this, 'failure', ['2', '3', '4']);
                    this.dialog.$("form").submit();
                });

                it("posts the success/failure recipients", function() {
                    var json = this.server.lastCreate().json()['job'];
                    expect(json['success_recipients']).toEqual([3, 4]);
                    expect(json['failure_recipients']).toEqual([2, 3, 4]);
                });
            });

            itBehavesLike.aDialogLauncher('a.select_success_recipients', chorus.dialogs.PickJobRecipients);
            itBehavesLike.aDialogLauncher('a.select_failure_recipients', chorus.dialogs.PickJobRecipients);
        });
    });
});
