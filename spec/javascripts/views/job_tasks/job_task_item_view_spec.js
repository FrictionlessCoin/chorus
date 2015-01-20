describe("chorus.views.JobTaskItem", function () {
    beforeEach(function() {
        this.job = backboneFixtures.job();
        this.collection = this.job.tasks();
        this.model = this.collection.at(0);
        this.view = new chorus.views.JobTaskItem({ model: this.model });
        this.view.render();
        chorus.page = {model: this.job};
    });

    afterEach(function () {
        delete chorus.page;
    });

    it("links the task's name to its show page", function() {
        expect(this.view.$(".name")).toHaveText(this.model.get("name"));
    });

    it("includes the correct task icon", function() {
        this.model.set('action', 'run_work_flow');
        expect(this.view.$("img")).toHaveAttr("src", "/images/jobs/task-afm.png");

        this.model.set('action', 'run_sql_workfile');
        expect(this.view.$("img")).toHaveAttr("src", "/images/workfiles/large/sql.png");

        this.model.set('action', 'import_source_data');
        expect(this.view.$("img")).toHaveAttr("src", "/images/jobs/task-import.png");
    });

    it("includes the correct task translation", function () {
        this.model.set('action', 'run_work_flow');
        expect(this.view.$(".action")).toContainTranslation("job_task.action.run_work_flow");

        this.model.set('action', 'run_sql_workfile');
        expect(this.view.$(".action")).toContainTranslation("job_task.action.run_sql_workfile");

        this.model.set('action', 'import_source_data');
        expect(this.view.$(".action")).toContainTranslation("job_task.action.import_source_data");
    });

    it("links the task's name to its show page", function() {
        expect(this.view.$(".action")).toContainTranslation("job_task.action." + this.model.get("action"));
    });

    describe("ordering arrows", function() {
        it("has a down arrow as the first item in the list", function() {
            this.model = this.collection.at(0);
            this.view.model = this.model;
            this.view.render();
            expect(this.view.$('.down_arrow')).toExist();
            expect(this.view.$('.up_arrow')).not.toExist();
        });

        it("has an up arrow as the last item in the list", function() {
            this.model = this.collection.at(this.collection.length - 1);
            this.view.model = this.model;
            this.view.render();
            expect(this.view.$('.down_arrow')).not.toExist();
            expect(this.view.$('.up_arrow')).toExist();
        });

        context("when the item is in the middle of the collection", function() {
            beforeEach(function() {
                this.model = this.collection.at(1);
                this.view = new chorus.views.JobTaskItem({ model: this.model });
                this.view.render();
            });

            it("has both an up and down arrow as an", function() {
                expect(this.view.$('.down_arrow')).toExist();
                expect(this.view.$('.up_arrow')).toExist();
            });

            function itReordersTheList() {
                it("makes a request to re-order the list ", function() {
                    var json = this.server.lastUpdateFor(this.job).json();
                    expect(json['job']['task_id_order']).toEqual(this.ids);
                });
            }

            context("when the down arrow is clicked", function() {
                beforeEach(function() {
                    this.view.$('.down_arrow').click();
                    this.ids = this.collection.chain().pluck('id').invoke('toString').value();
                    chorus.arrayHelpers.swap(this.ids, 1, 2);
                });

                itReordersTheList();
            });

            context("when the up arrow is clicked", function() {
                beforeEach(function() {
                    this.view.$('.up_arrow').click();
                    this.ids = this.collection.chain().pluck('id').invoke('toString').value();

                    chorus.arrayHelpers.swap(this.ids, 1, 0);
                });

                itReordersTheList();
            });
        });
    });
});
