;(function() {
    var CLASS_MAP = {
        "actor": "User",
        "dataset": "Dataset",
        "greenplumInstance": "GreenplumInstance",
        "newOwner": "User",
        "hadoopInstance": "HadoopInstance",
        "workfile": "Workfile",
        "workspace": "Workspace",
        "sandbox_schema": "Schema"
    };

    chorus.models.Activity = chorus.models.Base.extend({
        constructorName: "Activity",

        author: function() {
            if (!this._author && this.has("author")) {
                this._author = new chorus.models.User(this.get("author"))
            }

            return this._author;
        },

        getModel: function(name) {
            var className = CLASS_MAP[name];
            var modelClass = chorus.models[className];
            return new modelClass(this.get(name));
        },

        comments: function() {
            this._comments || (this._comments = new chorus.collections.CommentSet(
                this.get("comments"), {
                    entityType: this.collection && this.collection.attributes.entityType,
                    entityId: this.collection && this.collection.attributes.entityId
                }
            ));
            return this._comments;
        },

        parentComment: function() {
            if (this.get("parentComment")) {
                this._parentComment || (this._parentComment = new chorus.models.Activity(this.get("parentComment")));
            }

            return this._parentComment;
        },

        promoteToInsight: function(options) {
            var insight = new chorus.models.CommentInsight({
                id: this.get("id"),
                action: "promote"
            });
            insight.bind("saved", function() {
                this.collection.fetch();
                if (options && options.success) {
                    options.success(this);
                }
            }, this);

            insight.save(null, { method: "create" });
        },

        publish: function() {
            var insight = new chorus.models.CommentInsight({
                id: this.get("id"),
                action: "publish"
            });

            insight.bind("saved", function() {
                this.collection.fetch();
            }, this);

            insight.save(null, { method: "create" });
        },

        unpublish: function() {
            var insight = new chorus.models.CommentInsight({
                id: this.get("id"),
                action: "unpublish"
            });

            insight.bind("saved", function() {
                this.collection.fetch();
            }, this);

            insight.save(null, { method: "create" });
        },

        toComment: function(attrs, options) {
            var comment = new chorus.models.Comment({
                id: this.id,
                body: this.get("text")
            });

            comment.bind("saved", function() {
                options && options.success && options.success();
                this.collection.fetch();
            }, this);

            return comment;
        },

        attachments: function() {
            if (!this._attachments) {
                this._attachments = _.map(this.get("artifacts"), function(artifactJson) {
                    var klass;
                    switch (artifactJson.entityType) {
                        case 'workfile':
                            klass = chorus.models.Workfile;
                            break;
                        case 'chorusView':
                        case 'databaseObject':
                            klass = chorus.models.Dataset;
                            break;
                        default:
                            klass = chorus.models.Artifact;
                            break;
                    }
                    return new klass(artifactJson);
                });
            }
            return this._attachments;
        },

        isNote: function() {
            return this.get("type") === "NOTE";
        },

        isInsight: function() {
            return this.get("type") === "INSIGHT_CREATED";
        },

        isSubComment: function() {
            return this.get("type") === "SUB_COMMENT";
        },

        isUserGenerated: function () {
            return this.isNote() || this.isInsight() || this.isSubComment();
        },

        isPublished: function() {
            return this.get("isPublished") === true;
        }
    });
})();
