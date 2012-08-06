describe("chorus.models.Activity", function() {
    beforeEach(function() {
        this.model = rspecFixtures.activity.greenplumInstanceCreated();
    });

    describe("model associations", function() {
        var activity;

        describe("#newOwner", function() {
            it("returns a user with the newOwner data", function() {
                activity = rspecFixtures.activity.greenplumInstanceChangedOwner({
                    actor: { id: 5 },
                    greenplumInstance: { id: 6 },
                    newOwner: { id: 7 }
                });

                var newOwner = activity.newOwner();
                expect(newOwner).toBeA(chorus.models.User);
                expect(newOwner.id).toBe(7);
            });
        });

        describe("#actor", function() {
            it("returns a user with the right data", function() {
                activity = rspecFixtures.activity.greenplumInstanceChangedOwner({
                    actor: { id: 5 },
                    greenplumInstance: { id: 6 },
                    newOwner: { id: 7 }
                });

                var actor = activity.actor();
                expect(actor).toBeA(chorus.models.User);
                expect(actor.id).toBe(5);
            });
        });

        describe("#member", function() {
            it("returns a user with the right data", function() {
                activity = rspecFixtures.activity.membersAdded({
                    actor: { id: 5 },
                    member: { id: 6 }
                });

                var member = activity.member();
                expect(member).toBeA(chorus.models.User);
                expect(member.id).toBe(6);
            });
        });

        describe("#hadoopInstance", function() {
            it("returns a hadoop instance with the right data", function() {
                activity = rspecFixtures.activity.hadoopInstanceCreated({
                    hadoopInstance: { id: 8 }
                });

                var hadoopInstance = activity.hadoopInstance();
                expect(hadoopInstance).toBeA(chorus.models.HadoopInstance);
                expect(hadoopInstance.id).toBe(8);
            });
        });

        describe("#greenplumInstance", function() {
            it("returns a greenplum instance with the right data", function() {
                activity = rspecFixtures.activity.greenplumInstanceChangedOwner({
                    actor: { id: 5 },
                    greenplumInstance: { id: 6 },
                    newOwner: { id: 7 }
                });

                var greenplumInstance = activity.greenplumInstance();
                expect(greenplumInstance).toBeA(chorus.models.GreenplumInstance);
                expect(greenplumInstance.id).toBe(6);
            });
        });

         describe("#workspace", function() {
            it("returns a Workspace with the right data", function() {
                activity = rspecFixtures.activity.sourceTableCreated({
                    dataset: { id: 9 }, workspace: {id: 10}
                });

                var workspace = activity.workspace();
                expect(workspace).toBeA(chorus.models.Workspace);
                expect(workspace.id).toBe(10);
            });
        });

        describe("#workfile", function() {
            it("returns a workfile with the right data", function() {
                activity = rspecFixtures.activity.workfileCreated({
                    workfile: {id: 11}
                });

                var workfile = activity.workfile();
                expect(workfile).toBeA(chorus.models.Workfile);
                expect(workfile.id).toBe(11);
            });
        });

        describe("#dataset", function() {
            var dataset;

            beforeEach(function() {
                activity = rspecFixtures.activity.sourceTableCreated({
                    dataset: { id: 9 }, workspace: {id: 10}
                });

                dataset = activity.dataset();
            });

            it("returns a WorkspaceDataset with the right data", function() {
                expect(dataset).toBeA(chorus.models.WorkspaceDataset);
                expect(dataset.id).toBe(9);
            });

            it("adds the workspace data to the dataset", function() {
                expect(dataset.get("workspace").id).toBe(10);
            });
        });

        describe("#sourceDataset", function() {
            var dataset;

            beforeEach(function() {
                activity = rspecFixtures.activity.datasetImportSuccess({
                    sourceDataset: { id: 9, associatedWorkspaces: [{id: 10}]}
                });

                dataset = activity.importSource();
            });

            it("returns a WorkspaceDataset with the right data", function() {
                expect(dataset).toBeA(chorus.models.WorkspaceDataset);
                expect(dataset.id).toBe(9);
            });

            it("adds the workspace data to the sourceDataset", function() {
                expect(dataset.get("associatedWorkspaces")[0].id).toBe(10);
            });
        });

        describe("#newUser", function() {
            it("returns a new user with the right data", function() {
                activity = rspecFixtures.activity.userCreated({
                    newUser: {id: 12}
                });

                var user = activity.newUser();
                expect(user).toBeA(chorus.models.User);
                expect(user.id).toBe(12);
            });
        });

        describe("#noteObject", function() {
            context("for a NOTE_ON_GREENPLUM_INSTANCE", function() {
                it("returns a greenplumInstance with the right data", function() {
                    activity = rspecFixtures.activity.noteOnGreenplumInstanceCreated({
                        greenplumInstance: { id: 13 }
                    });

                    var instance = activity.greenplumInstance();
                    expect(instance).toBeA(chorus.models.GreenplumInstance);
                    expect(instance.id).toBe(13);
                });
            });

            context("for a NOTE_ON_HDFS_FILE", function() {
                it("returns a hdfsFile with the right data", function() {
                    activity = rspecFixtures.activity.noteOnHdfsFileCreated({
                        hdfsFile: { path: "/happy/path.txt", hadoopInstanceId: 331 }
                    });
                    var hdfsFile = activity.noteObject();
                    expect(hdfsFile).toBeA(chorus.models.HdfsFile);
                    expect(hdfsFile.get("path")).toBe("/happy/path.txt");
                    expect(hdfsFile.get("hadoopInstance").id).toBe(331)
                });
            });

            context("for a NOTE_ON_WORKSPACE", function() {
                it("returns a workspace with the right data", function() {
                    activity = rspecFixtures.activity.noteOnWorkspaceCreated({
                        workspace: { id: 123 }
                    });
                    var workspace = activity.noteObject();
                    expect(workspace).toBeA(chorus.models.Workspace);
                    expect(workspace.get("id")).toBe(123)
                });
            });

            context("for a NOTE_ON_DATASET", function() {
                it("returns a dataset with the right data", function() {
                    activity = rspecFixtures.activity.noteOnDatasetCreated({
                        dataset: { id: 123 }
                    });
                    var dataset = activity.noteObject();
                    expect(dataset).toBeA(chorus.models.Dataset);
                    expect(dataset.get("id")).toBe(123)
                });
            });

            context("for a NOTE_ON_WORKSPACE_DATASET", function() {
                it("returns a workspace dataset with the right data", function() {
                    activity = rspecFixtures.activity.noteOnWorkspaceDatasetCreated({
                        dataset: { id: 123 }
                    });
                    var ws_dataset = activity.noteObject();
                    expect(ws_dataset).toBeA(chorus.models.WorkspaceDataset);
                    expect(ws_dataset.get("id")).toBe(123)
                });
            });

            context("for a NOTE_ON_WORKFILE", function() {
                it("returns a workfile with the right data", function() {
                    activity = rspecFixtures.activity.noteOnWorkfileCreated({
                        workfile: { id: 123 }
                    });
                    var workfile = activity.noteObject();
                    expect(workfile).toBeA(chorus.models.Workfile);
                    expect(workfile.get("id")).toBe(123)
                });
            });
        });

        describe("#hdfsEntry", function() {
            it("returns hdfs entry with the right data", function() {
                activity = rspecFixtures.activity.hdfsExternalTableCreated({
                    hdfsFile: {
                        hadoopInstanceId: 1,
                        path : "/data/test/test.csv"
                    }
                });

                var hdfsEntry = activity.hdfsEntry();
                expect(hdfsEntry).toBeA(chorus.models.HdfsEntry);
                expect(hdfsEntry.get("path")).toBe("/data/test")
                expect(hdfsEntry.name()).toBe("test.csv")
                expect(hdfsEntry.get("hadoopInstance").id).toBe(1)
            });

        });
    });

    describe("#isUserGenerated", function() {
        it("returns true for notes", function() {
            expect(rspecFixtures.activity.noteOnGreenplumInstanceCreated().isUserGenerated()).toBeTruthy();
        });

        it("returns true for 'INSIGHT_CREATED' activities", function() {
            expect(fixtures.activities.INSIGHT_CREATED().isUserGenerated()).toBeTruthy();
        });

        it("returns false for other activities", function() {
            expect(rspecFixtures.activity.membersAdded().isUserGenerated()).toBeFalsy();
        });

        it("returns true for sub-comments", function() {
            expect(fixtures.activities.SUB_COMMENT().isUserGenerated()).toBeTruthy();
        });
    });

    describe("#isFailure", function() {
        it("returns true for IMPORT_FAILED", function() {
            expect(rspecFixtures.activity.fileImportFailed().isFailure()).toBeTruthy();
            expect(rspecFixtures.activity.datasetImportFailed().isFailure()).toBeTruthy();
        });

        it("returns false for other activities", function() {
            expect(rspecFixtures.activity.userCreated().isFailure()).toBeFalsy();
        });
    });

    describe("#isSuccessfulImport", function() {
        it("returns true for IMPORT SUCCESS", function() {
            expect(rspecFixtures.activity.fileImportSuccess().isSuccessfulImport()).toBeTruthy();
            expect(rspecFixtures.activity.datasetImportSuccess().isSuccessfulImport()).toBeTruthy();
        });

        it("returns false for other activities", function() {
            expect(rspecFixtures.activity.fileImportFailed().isSuccessfulImport()).toBeFalsy();
            expect(rspecFixtures.activity.datasetImportFailed().isSuccessfulImport()).toBeFalsy();
        });

    });

    describe("#isOwner", function() {

        it("returns true for notes is current user is the owner of note", function() {
            activity2 = rspecFixtures.activity.noteOnGreenplumInstanceCreated({
                greenplumInstance: { id: 13 },
                actor: {id: chorus.session.user().id}

            });
            expect(activity2.isOwner()).toBeTruthy();
        });
        it("returns false for notes is current user is not the owner of note", function() {
            activity2 = rspecFixtures.activity.noteOnGreenplumInstanceCreated({
                greenplumInstance: { id: 13 },
                actor: {id: 1}

            });
            expect(activity2.isOwner()).toBeFalsy();
        });

    });

    describe("#toNote", function() {
        beforeEach(function() {
            this.model = rspecFixtures.activity.noteOnGreenplumInstanceCreated({
                id: 101
            });

            this.model.collection = chorus.collections.ActivitySet.forDashboard();
        });

        it("returns a note with the right attributes", function() {
            var note = this.model.toNote();
            expect(note).toBeA(chorus.models.Note);
            expect(note.get("id")).toBe(101);
            expect(note.get("body")).toBe(this.model.get("body"));
        });

        describe("when the note is saved", function() {
            it("re-fetches the activity's collection", function() {
                this.model.toNote().trigger("saved");
                expect(this.model.collection).toHaveBeenFetched();
            });
        });

        describe("when the note is destroyed", function() {
            it("re-fetches the activity's collection", function() {
                spyOn(chorus, "toast")
                this.model.toNote().trigger("destroy");
                expect(this.model.collection).toHaveBeenFetched();
            });
        });
    });

    describe("#promoteToInsight", function() {
        beforeEach(function() {
            this.success = jasmine.createSpy("success");
            this.model.collection = chorus.collections.ActivitySet.forDashboard();
            this.model.promoteToInsight({ success: this.success });
        });

        it("posts to the comment insight url", function() {
            expect(this.server.lastCreate().url).toBe("/commentinsight/" + this.model.get("id") + "/promote");
        });

        it("calls the success function", function() {
            this.server.lastCreate().succeed();
            expect(this.success).toHaveBeenCalledWith(this.model);
        });
    });

    describe("#publish", function() {
        it("posts to the comment insight url with the publish action", function() {
            this.model.publish();
            expect(this.server.lastCreate().url).toBe("/commentinsight/" + this.model.get("id") + "/publish");
        });
    });

    describe("#unpublish", function() {
        it("posts to the comment insight url with the unpublish action", function() {
            this.model.unpublish();
            expect(this.server.lastCreate().url).toBe("/commentinsight/" + this.model.get("id") + "/unpublish");
        });
    });

    describe("#isNote", function() {
        it("returns true for notes", function() {
            this.model.set({ action: "NOTE" });
            expect(this.model.isNote()).toBeTruthy();
        });

        it("returns false for non-notes", function() {
            this.model.set({ type: "WORKSPACE_MAKE_PUBLIC" });
            expect(this.model.isNote()).toBeFalsy();
        });
    });

    describe("#isInsight", function() {
        it("returns true for insights", function() {
            this.model.set({ type: "INSIGHT_CREATED" });
            expect(this.model.isInsight()).toBeTruthy();
        });

        it("returns false for non-insights", function() {
            this.model.set({ type: "WORKSPACE_MAKE_PUBLIC" });
            expect(this.model.isInsight()).toBeFalsy();
        });
    });

    describe("#isSubComment", function() {
        it("returns true for sub-comments", function() {
            this.model.set({ type: "SUB_COMMENT" });
            expect(this.model.isSubComment()).toBeTruthy();
        });

        it("returns false for anything else", function() {
            this.model.set({ type: "NOTE" });
            expect(this.model.isSubComment()).toBeFalsy();
        });
    });

    describe("#isPublished", function() {
        it("returns true for insights that are published", function() {
            this.model.set({isPublished: true});
            expect(this.model.isPublished()).toBeTruthy();
        });

        it("returns false for insights that are not published", function() {
            this.model.set({isPublished: false});
            expect(this.model.isPublished()).toBeFalsy();
        });

        it("returns false for non-insights", function() {
            this.model.set({isPublished: undefined});
            expect(this.model.isPublished()).toBeFalsy();
        });
    });

    xdescribe("#author", function() {
        context("when author information is present", function() {
            it("creates a user", function() {
                expect(this.model.author()).toBeA(chorus.models.User);
            });

            it("returns the same instance when called multiple times", function() {
                expect(this.model.author()).toBe(this.model.author());
            });
        });

        context("when author information is not present", function() {
            beforeEach(function() {
                this.model.unset("author");
            });

            it("returns undefined", function() {
                expect(this.model.author()).toBeUndefined();
            });
        });
    });

    describe("#comments", function() {
        beforeEach(function() {
            this.activitySet = new chorus.collections.ActivitySet([this.model], {entityType: "workspace", entityId: 10000})
            this.model.set({
                comments: [
                    {
                        text: "I'm cold.'",
                        author: {
                            image: { original: "/foo", icon: "/bar" },
                            id: "1234",
                            lastName: "Smith",
                            firstName: "Bob"
                        },
                        timestamp: "2011-12-15 12:34:56"
                    }
                ]
            });
            this.model.set({id: 5});
            this.comments = this.model.comments();
        });

        it("returns a CommentSet", function() {
            expect(this.comments).toBeA(chorus.collections.CommentSet);
        });

        it("memoizes", function() {
            expect(this.comments).toBe(this.model.comments());
        });

        it("contains the activity item's comments", function() {
            var commentsJson = this.model.get("comments");
            expect(this.comments.models[0].get("text")).toBe(commentsJson[0].text);
            expect(this.comments.models[0].get("timestamp")).toBe(commentsJson[0].timestamp);
            expect(this.comments.models[0].author().get("firstName")).toBe(commentsJson[0].author.firstName);
        });

        it("sets the entityType and entityId as attributes of the CommentSet", function() {
            expect(this.comments.attributes.entityType).toBe("workspace");
            expect(this.comments.attributes.entityId).toBe(10000);
        });
    });

    describe("#parentComment", function() {
        beforeEach(function() {
            this.model = fixtures.activities.COMMENT_ON_NOTE_ON_DATABASE_TABLE();
            this.parentComment = this.model.parentComment();
        });

        it("should return a comment activity", function() {
            expect(this.parentComment).toBeA(chorus.models.Activity);
        });

        xit("should retain the data", function() {
           expect(this.parentComment.dataset().name()).toBe(this.model.get("parentComment").dataset.name);
        });

        it("memoizes", function() {
            expect(this.parentComment).toBe(this.model.parentComment());
        })
    });

    describe("#attachments", function() {
        beforeEach(function() {
            this.model.set({
                attachments: [
                    { entityType: "workfile", id: 1 },
                    { entityType: "attachment", id: 2 },
                    { entityType: "dataset", id: 3 },
                    { entityType: "chorusView", id: 4 }
                ]
            });
            this.attachments = this.model.attachments();
        });

        it("returns an array of file models (Workfiles, Attachments Datasets)", function() {
            expect(this.attachments[0]).toBeA(chorus.models.Workfile)
            expect(this.attachments[1]).toBeA(chorus.models.Attachment)
            expect(this.attachments[2]).toBeA(chorus.models.WorkspaceDataset)
            expect(this.attachments[3]).toBeA(chorus.models.WorkspaceDataset)
        });

        it("memoizes", function() {
            expect(this.attachments).toBe(this.model.attachments());
        });
    });
});
