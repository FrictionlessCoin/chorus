describe("chorus.dialogs.PickJobRecipients", function () {
    var user1, user2, user3;

    beforeEach(function () {
        user1 = backboneFixtures.user();
        user2 = backboneFixtures.user({firstName: 'Smith'});
        user3 = backboneFixtures.user({firstName: 'Tony', lastName: 'Danza'});

        this.job = backboneFixtures.job();
        this.job.set('successRecipients', [user2.get('id'), user3.get('id')]);

        this.dialog = new chorus.dialogs.PickJobRecipients({
            model: this.job,
            condition: 'success'
        });
    });

    describe("initialization", function () {
        it("fetches all members", function () {
            expect(this.dialog.available).toHaveBeenFetched();
        });
    });

    describe("render", function () {
        beforeEach(function () {
            spyOn(this.dialog, 'preRender').andCallThrough();
            this.dialog.render();
        });

        it("renders when the member fetch completes", function() {
            this.dialog.preRender.reset();
            this.dialog.available.trigger('reset');
            expect(this.dialog.preRender).toHaveBeenCalled();
        });

        context("after the fetch completes", function () {
            beforeEach(function () {
                this.server.completeFetchFor(this.dialog.available, [user1, user2, user3]);
            });

            it("instantiates chosen members from the IDs provided", function () {
                expect(this.dialog.chosen.models).toEqual([user2, user3]);
            });

            it("renders a shuttle", function() {
                expect(this.dialog.shuttle instanceof chorus.views.ShuttleWidget).toBeTruthy();
                expect(this.dialog.$(".shuttle.shuttle_widget")).toExist();
                expect(this.dialog.$('.shuttle_body .available li').length).toEqual(this.dialog.available.size());
                expect(this.dialog.$('.shuttle_body .selected .added').length).toEqual(this.dialog.chosen.size());
            });

            describe("when the submit button is clicked", function() {
                beforeEach(function() {
                    spyOn(this.dialog.shuttle, "getSelectedIDs").andReturn(["2"]);
                    spyOn(this.dialog, 'closeModal');
                    this.dialog.$('button.submit').click();
                });

                it("saves the selected ids back to the model", function () {
                    expect(this.job.get('successRecipients')).toEqual([2]);
                });

                it("closes the modal", function () {
                    expect(this.dialog.closeModal).toHaveBeenCalled();
                });
            });
        });

    });
});