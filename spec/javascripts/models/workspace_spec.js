describe("chorus.models.Workspace", function() {
    beforeEach(function() {
        this.model = backboneFixtures.workspace({
            id: 123,
            archivedAt: null,
            image: {
                icon: "/system/workspaces/images/000/000/005/icon/workspaceimage.jpg",
                original: "/system/workspaces/images/000/000/005/original/workspaceimage.jpg"
            }
        });
    });

    describe("validation", function() {
        it("should return a truthy value for a valid workspace", function() {
            expect(this.model.performValidation()).toBeTruthy();
        });

        it('doesnt allow blank name', function() {
            this.model.unset('name');
            expect(this.model.performValidation()).toBeFalsy();
        });
    });

    it("has the correct urlTemplate", function() {
        expect(this.model.urlTemplate).toBe("workspaces/{{id}}");
    });

    it("has the correct entityType", function() {
        expect(this.model.entityType).toBe("workspace");
    });

    describe("#isActive", function() {
        it("return true when active:true", function() {
            this.model.set({archivedAt: null});
            expect(this.model.isActive()).toBeTruthy();
        });

        it("returns false otherwise", function() {
            this.model.set({ archivedAt: "2012-05-08 21:40:14" });
            expect(this.model.isActive()).toBeFalsy();
        });
    });

    describe("#datasetsInDatabase(database)", function() {
        beforeEach(function() {
            var database = backboneFixtures.schema({ database: {name: "foo", id: '123'} }).database();
            this.datasets = this.model.datasetsInDatabase(database);
        });

        it("returns a dataset set with the right workspace and database", function() {
            expect(this.datasets).toBeA(chorus.collections.WorkspaceDatasetSet);
            expect(this.datasets.attributes.workspaceId).toBe(this.model.id);
            expect(this.datasets.attributes.database.id).toBe("123");
        });
    });

    describe("#sandboxTables()", function() {
        it("returns a dataset set of only sandbox tables", function() {
            var collection = this.model.sandboxTables();
            expect(collection).toBeA(chorus.collections.WorkspaceDatasetSet);
            expect(collection.attributes.workspaceId).toEqual(123);
            expect(collection.attributes.type).toEqual("SANDBOX_TABLE");
            expect(collection.attributes.objectType).toEqual("TABLE");
        });

        it("memoizes", function() {
            expect(this.model.sandboxTables()).toBe(this.model.sandboxTables());
        });
    });

    describe("#importSourceDatasets", function () {
        it("should return only source datasets", function () {
            var collection = this.model.importSourceDatasets();
            expect(collection).toBeA(chorus.collections.WorkspaceDatasetSet);
            expect(collection.attributes.workspaceId).toEqual(123);
            expect(collection.attributes.type).toEqual("SOURCE_TABLE");
            expect(collection.attributes.objectType).toEqual("TABLE");
        });
    });

    describe("#isPublic", function() {
        it("return true when public: true", function() {
            this.model.set({"public": true});
            expect(this.model.isPublic()).toBeTruthy();
        });

        it("returns false otherwise", function() {
            this.model.set({ "public": false });
            expect(this.model.isPublic()).toBeFalsy();
        });
    });

    describe("#defaultIconUrl", function() {
        it("links to the active url when workspace is active", function() {
            this.model.set({archivedAt: null, "public": true});
            expect(this.model.defaultIconUrl()).toBe("/images/workspaces/workspace_large.png");
        });

        it("links to the archive url when workspace is not active  ", function() {
            this.model.set({archivedAt: "2012-05-08 21:40:14", "public": true});
            expect(this.model.defaultIconUrl()).toBe("/images/workspaces/workspace_archived_large.png");
        });

        it("links to the private active url when workspace is active and public:false", function() {
            this.model.set({archivedAt: null, "public": false});
            expect(this.model.defaultIconUrl()).toBe("/images/workspaces/workspace_private_large.png");
        });

        it("links to the private archive url otherwise", function() {
            this.model.set({archivedAt: "2012-05-08 21:40:14", "public": false});
            expect(this.model.defaultIconUrl()).toBe("/images/workspaces/workspace_private_archived_large.png");
        });
    });

    describe("#customIconUrl", function() {
        it("links to the original url by default", function() {
            this.model.set({id: 5});
            expect(this.model.customIconUrl()).toBe("/system/workspaces/images/000/000/005/original/workspaceimage.jpg");
        });

        it("links to the requested size", function() {
            this.model.set({id: 5});
            expect(this.model.customIconUrl({size: 'icon'})).toBe("/system/workspaces/images/000/000/005/icon/workspaceimage.jpg");
        });
    });

    describe("#datasets", function() {
        it("returns a dataset set with the right workspace id", function() {
            var datasets = this.model.datasets();
            expect(datasets).toBeA(chorus.collections.WorkspaceDatasetSet);
            expect(datasets.attributes.workspaceId).toBe(this.model.id);
        });
    });

    describe("#workfilesUrl", function() {
        it("links to the workfile index route", function() {
            this.model.set({id: 5});
            expect(this.model.workfilesUrl()).toBe("#/workspaces/5/workfiles");
        });
    });

    describe("#jobsUrl", function() {
        it("links to the workfile index route", function() {
            this.model.set({id: 5});
            expect(this.model.jobsUrl()).toBe("#/workspaces/5/jobs");
        });
    });

    describe("#owner", function() {
        context('when owner data is not nested', function() {
            beforeEach(function() {
                this.model.set({ owner: "jhenry", ownerFirstName: "John", ownerLastName: "Henry", ownerId: "47" });
            });

            it("has the attributes", function() {
                expect(this.model.owner().get("id")).toBe("47");
                expect(this.model.owner().get("username")).toBe("jhenry");
                expect(this.model.owner().get("firstName")).toBe("John");
                expect(this.model.owner().get("lastName")).toBe("Henry");
            });

            it("doesn't automatically fetch the User", function() {
                var numberOfServerRequests = this.server.requests.length;
                this.model.owner();
                expect(this.server.requests.length).toBe(numberOfServerRequests);
            });
        });

        context('when owner data is nested', function() {
            beforeEach(function() {
                this.model.set({ owner: { id: '47' } });
            });

            it("has the right userId", function() {
                expect(this.model.owner().get("id")).toBe("47");
            });

            it("doesn't automatically fetch the User", function() {
                var numberOfServerRequests = this.server.requests.length;
                this.model.owner();
                expect(this.server.requests.length).toBe(numberOfServerRequests);
            });

            it("stays up-to-date when the owner is updated", function() {
                var initialOwner = this.model.owner();

                this.model.set({ owner: {
                    id: "101",
                    username: "new_guy"
                }});

                var newOwner = this.model.owner();
                expect(newOwner).not.toBe(initialOwner);
                expect(newOwner.get("id")).toBe("101");
                expect(newOwner.get("username")).toBe("new_guy");
            });
        });
    });

    describe("#members", function() {
        beforeEach(function() {
            this.model.set({id: 5});
            this.members = this.model.members();
        });

        it("has the right url", function() {
            expect(this.model.members().url()).toContain("/workspaces/5/members");
        });

        it("memoizes", function() {
            expect(this.members).toBe(this.model.members());
        });

        context("when the 'saved' event is triggered on the members", function() {
            beforeEach(function() {
                this.changeSpy = jasmine.createSpy("changeSpy");
                this.model.bind("change", this.changeSpy);
            });

            it("triggers 'change' on the workspace", function() {
                this.members.trigger("saved");
                expect(this.changeSpy).toHaveBeenCalled();
            });
        });
    });

    describe("#comments", function() {
        beforeEach(function() {
            this.model.set({ id: 5, latestCommentList: [backboneFixtures.comment().attributes] });
            this.comments = this.model.comments();
        });

        it("returns a CommentSet", function() {
            expect(this.comments instanceof chorus.collections.CommentSet).toBeTruthy();
        });

        it("memoizes", function() {
            expect(this.comments).toBe(this.model.comments());
        });

        it("initially contains the workspace's latestCommentList", function() {
            var serializedComments = this.model.get("latestCommentList");
            expect(_.first(serializedComments).body).toBeTruthy(); //assert it exists first
            expect(_.first(this.comments.models).attributes).toEqual(_.first(serializedComments));
        });
    });

    describe("#hasImage", function() {
        it("returns false when the workspace's 'imageId' field is null", function() {
            this.model.set({ image: {original: "", icon: ""} });
            expect(this.model.hasImage()).toBeFalsy();
        });

        it("returns true when the workspace's 'imageId' field is not null", function() {
            this.model.set({ image: {original: "5.jpg", icon: "5.jpg"} });
            expect(this.model.hasImage()).toBeTruthy();
        });
    });

    describe("#fetchImageUrl", function() {
        var workspace;

        beforeEach(function() {
            spyOn(chorus, "cachebuster").andReturn(12345);
            workspace = backboneFixtures.workspace({
                archivedAt: null,
                image: {
                    icon: "/system/workspaces/images/000/000/005/icon/workspaceimage.jpg",
                    original: "/system/workspaces/images/000/000/005/original/workspaceimage.jpg"
                }
            });
        });

        it("returns undefined when the workspace does not have an image", function() {
            workspace.unset("image");
            expect(workspace.fetchImageUrl()).toBeUndefined();
        });

        it("appends a cache-busting query param", function() {
            expect(workspace.fetchImageUrl()).toContainQueryParams({ iebuster: 12345 });
        });

        it("uses the URL for the original-sized image by default", function() {
            expect(workspace.fetchImageUrl()).toHaveUrlPath("/system/workspaces/images/000/000/005/original/workspaceimage.jpg");
        });

        it("uses the icon url if the 'size' option is set to 'icon'", function() {
            expect(workspace.fetchImageUrl({ size: "icon" })).toHaveUrlPath("/system/workspaces/images/000/000/005/icon/workspaceimage.jpg");
        });
    });

    describe("#archiver", function() {
        beforeEach(function() {
            this.model.set({archiver: {firstName: "John", lastName: "Henry", username: "jhenry"}});
        });

        it("returns a new User with the right username and fullName", function() {
            var archiver = this.model.archiver();
            expect(archiver.displayName()).toBe("John Henry");
            expect(archiver.get("username")).toBe("jhenry");
        });

    });

    describe("#displayName", function() {
        beforeEach(function() {
            this.model = backboneFixtures.workspace();
        });

        it("returns the name", function() {
            expect(this.model.displayName()).toBe(this.model.get("name"));
        });
    });

    describe("#createImageUrl", function() {
        beforeEach(function() {
            this.model = backboneFixtures.workspace({id: 10013});
        });

        it("uses the right URL", function() {
            expect(this.model.createImageUrl()).toBe("/workspaces/10013/image");
        });
    });

    describe("picklistImageUrl", function() {
        it("returns the correct URL when the workspace is archived and is public", function() {
            this.model.set({archivedAt: "2012-05-08 21:40:14", "public": true});
            expect(this.model.picklistImageUrl()).toMatchUrl('/images/workspaces/workspace_archived_small.png');
        });

        it("returns the correct URL when the workspace is not archived and is public", function() {
            this.model.set({archivedAt: null, "public": true});
            expect(this.model.picklistImageUrl()).toMatchUrl('/images/workspaces/workspace_small.png');
        });

        it("returns the correct URL when the workspace is archived and is private", function() {
            this.model.set({archivedAt: "2012-05-08 21:40:14", "public": false});
            expect(this.model.picklistImageUrl()).toMatchUrl('/images/workspaces/workspace_archived_private_small.png');
        });

        it("returns the correct URL when the workspace is not archived and is private", function() {
            this.model.set({archivedAt: null, "public": false});
            expect(this.model.picklistImageUrl()).toMatchUrl('/images/workspaces/workspace_private_small.png');
        });
    });

    describe("#sandbox", function() {
        context("when the workspace has a sandbox", function() {
            beforeEach(function() {
                this.model = backboneFixtures.workspace({
                    sandboxInfo: {
                        id: 6,
                        name: "schema",
                        database: { id: 4, name: "db", dataSource: { id: 5, name: "dataSource" } }
                    }
                });
            });

            it("returns a Sandbox model", function() {
                expect(this.model.sandbox()).toBeA(chorus.models.Sandbox);
                expect(this.model.sandbox().get("id")).toBe(6);
            });

            it("populates the workspaceId", function() {
                expect(this.model.sandbox().get('workspaceId')).toBe(this.model.get('id'));
            });

            it("memoizes", function() {
                expect(this.model.sandbox()).toBe(this.model.sandbox());
            });
        });

        context("when the workspace does not have a sandbox", function() {
            beforeEach(function() {
                this.model = backboneFixtures.workspace();
                this.model.unset("sandboxInfo");
            });

            it("returns undefined", function() {
                expect(this.model.sandbox()).toBeFalsy();
            });

        });
    });

    describe("permissions checking", function() {
        beforeEach(function() {
            this.model.set({owner: {firstName: "John", lastName: "Henry", id: "47"}});
        });

        describe("#currentUserIsOwner", function() {
            it("returns true iff the current logged-in user is the owner", function() {
                setLoggedInUser({ id: "47" });
                expect(this.model.currentUserIsOwner()).toBeTruthy();
                setLoggedInUser({ id: "48" });
                expect(this.model.currentUserIsOwner()).toBeFalsy();
            });
        });

        describe("canRead", function() {
            it("is true when permission contains 'read'", function() {
                this.model.set({permission: ['read', 'commenting']});
                expect(this.model.canRead()).toBeTruthy();
            });

            it("is true when permission contains 'admin'", function() {
                this.model.set({permission: ['admin']});
                expect(this.model.canRead()).toBeTruthy();
            });

            it("is false when it does not contain either 'read' or 'admin'", function() {
                this.model.set({permission: []});
                expect(this.model.canRead()).toBeFalsy();
            });
        });

        describe("canComment", function() {
            it("is true when permission contains 'commenting'", function() {
                this.model.set({permission: ['commenting']});
                expect(this.model.canComment()).toBeTruthy();
            });

            it("is true when permission contains 'admin'", function() {
                this.model.set({permission: ['admin']});
                expect(this.model.canComment()).toBeTruthy();
            });

            it("is false when it does not contain either 'commenting' or 'admin'", function() {
                this.model.set({permission: []});
                expect(this.model.canComment()).toBeFalsy();
            });
        });

        describe("canUpdate", function() {
            it("is true when permission contains 'commenting'", function() {
                this.model.set({permission: ['read', 'update']});
                expect(this.model.canUpdate()).toBeTruthy();
            });

            it("is true when permission contains 'admin'", function() {
                this.model.set({permission: ['admin']});
                expect(this.model.canUpdate()).toBeTruthy();
            });

            it("is false when it does not contain either 'update' or 'admin'", function() {
                this.model.set({permission: []});
                expect(this.model.canUpdate()).toBeFalsy();
            });
        });

        describe("workspaceAdmin", function() {
            it("is true when permission contains 'admin'", function() {
                this.model.set({permission: ['admin']});
                expect(this.model.workspaceAdmin()).toBeTruthy();
            });

            it("is false when it does not contain 'admin'", function() {
                this.model.set({permission: ['update']});
                expect(this.model.workspaceAdmin()).toBeFalsy();
            });
        });
    });

    describe("#maxImageSize",function() {
        it("returns the max file size for workspace icons from the config", function() {
            chorus.models.Config.instance().set({fileSizesMbWorkspaceIcon: 3});
            expect(this.model.maxImageSize()).toBe(3);
        });
    });

    describe("#currentUserCanCreateWorkFlows", function () {
        context("when the workspace is active", function () {
            beforeEach(function () {
                spyOn(this.model, "isActive").andReturn(true);
            });

            context("the current user is a member-developer", function () {
                beforeEach(function () {
                    this.model.set({permission: ["create_workflow"]});
                });

                it("returns true", function(){
                    expect(this.model.currentUserCanCreateWorkFlows()).toBeTruthy();
                });
            });

            context("the current user is an owner", function () {
                beforeEach(function () {
                    this.model.set({permission: ["admin"]});
                });

                it("returns false", function(){
                    expect(this.model.currentUserCanCreateWorkFlows()).toBeFalsy();
                });
            });
        });

        context("when the workspace is archived", function () {
            it("returns false", function () {
                this.model.set("archivedAt", true);
                expect(this.model.currentUserCanCreateWorkFlows()).toBeFalsy();
            });
        });

        context("when the current user is not a member", function () {
            it("returns false", function () {
                this.model.set({permission: []});
                expect(this.model.currentUserCanCreateWorkFlows()).toBeFalsy();
            });
        });
    });

    describe("#currentUserCanDuplicateChorusViews", function() {
        context("the current user is a member", function () {
            beforeEach(function () {
                this.model.set({permission: ["duplicate_chorus_view"]});
            });

            it("returns true", function(){
                expect(this.model.currentUserCanDuplicateChorusViews()).toBeTruthy();
            });
        });

        context("the current user is an owner", function () {
            beforeEach(function () {
                this.model.set({permission: ["admin"]});
            });

            it("returns true", function(){
                expect(this.model.currentUserCanDuplicateChorusViews()).toBeTruthy();
            });
        });

        context("when the current user is not a member", function () {
            it("returns false", function () {
                this.model.set({permission: []});
                expect(this.model.currentUserCanDuplicateChorusViews()).toBeFalsy();
            });
        });
    });

    describe("#milestoneProgress", function () {
        it("returns the milestone progress (as %)", function () {
            this.model.set('milestoneCount', 200);
            this.model.set('milestoneCompletedCount', 152);
            expect(this.model.milestoneProgress()).toEqual(76);
        });

        context("when there are no milestones", function () {
            it("returns 0", function () {
                this.model.set('milestoneCount', 0);
                this.model.set('milestoneCompletedCount', 0);
                expect(this.model.milestoneProgress()).toEqual(0);
            });
        });

        context("when there are no completed milestones", function () {
            it("retuns 0", function () {
                this.model.set('milestoneCount', 10);
                this.model.set('milestoneCompletedCount', 0);
                expect(this.model.milestoneProgress()).toEqual(0);
            });
        });
    });

    describe("#milestonesUrl", function() {
        it("links to the milestones index route", function() {
            this.model.set({id: 5});
            expect(this.model.milestonesUrl()).toBe("#/workspaces/5/milestones");
        });
    });
});
