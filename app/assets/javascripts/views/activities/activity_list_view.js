chorus.views.ActivityList = chorus.views.Base.extend({
    constructorName: "ActivityListView",
    templateName:"activity_list",
    useLoadingSection:true,

    events:{
        "click .morelinks a.more, .morelinks a.less": "toggleCommentList",
        "click .more_activities a": "fetchMoreActivities"
    },

    setup: function() {
        chorus.PageEvents.subscribe('note:deleted', this.noteDeleted, this);
        chorus.PageEvents.subscribe('note:saved', this.noteSaved, this);
    },

    noteDeleted: function(note) {
        if (this.collection.get(note.id)) {
            this.collection.remove(note);
            this.render();
        }
    },

    noteSaved: function(note) {
        var collectionNote = this.collection.get(note.id);
        if (collectionNote) {
            collectionNote.set('body', note.get('body'));
            this.render();
        };
    },

    toggleCommentList:function (event) {
        event.preventDefault();
        $(event.target).closest(".comments").toggleClass("more");
        chorus.PageEvents.broadcast("content:changed");
    },

    fetchMoreActivities:function (ev) {
        ev.preventDefault();
        var pageToFetch = parseInt(this.collection.pagination.page, 10) + 1;
        this.collection.fetchPage(pageToFetch, { update: true, remove: false, success: _.bind(this.render, this) });
    },

    additionalContext:function () {
        var ctx = { activityType: this.options.type };
        if (this.collection.loaded && this.collection.pagination) {
            var page = parseInt(this.collection.pagination.page, 10);
            var total = parseInt(this.collection.pagination.total, 10);

            if (parseInt(this.collection.pagination.total, 10) !== -1) {
                ctx.showMoreLink = total > page;
            } else {
                var maxSize = this.collection.attributes.pageSize * page;
                ctx.showMoreLink = this.collection.length === maxSize;
            }
        } else {
            ctx.showMoreLink = false;
        }
        return ctx;
    },

    cleanupActivities:function () {
        _.each(this.activities, function (activity) {
            activity.teardown();
        });
    },

    postRender:function () {
        this.cleanupActivities();
        $(this.el).addClass(this.options.additionalClass);
        var ul = this.$("ul");
        this.activities = [];
        this.collection.each(function(model) {
            try {
                var view = new chorus.views.Activity({
                    model:model,
                    displayStyle: this.options.displayStyle,
                    isNotification: this.options.isNotification,
                    isReadOnly: this.options.isReadOnly
                });
                this.activities.push(view);
                this.registerSubView(view);
                ul.append(view.render().el);
            } catch (err) {
                chorus.log("error", err, "processing activity", model);
                if (chorus.isDevMode()) {
                    var action, id;
                    try {action = model.get("action");  id = model.id;} catch(err) {}
                    chorus.toast("bad_activity", {type: action, id: id, toastOpts: {theme: "bad_activity"}});
                }
            }
        }, this);
    },

    show: function() {
        _.each(this.activities, function(activity) {
            activity.show();
        });
    }
});