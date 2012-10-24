chorus.views.SearchResultCommentList = chorus.views.Base.extend({
    constructorName: "SearchResultCommentList",
    templateName: "search_result_comment_list",

    events: {
        "click a.show_more_comments": "showMoreComments",
        "click a.show_fewer_comments": "showFewerComments"
    },

    setup: function() {
        var comments = this.options.comments || [];
        var columns = this.options.columns || [];
        var columnDescriptions = this.options.columnDescriptions || [];
        var tableDescriptions = this.options.tableDescriptions || [];

        this.collection = comments.concat(columns).concat(columnDescriptions).concat(tableDescriptions);
    },

    showMoreComments: function(e) {
        e && e.preventDefault();
        var $li = $(e.target).closest("li");
        this.$(".has_more_comments").addClass("hidden");
        this.$(".more_comments").removeClass("hidden");
    },

    showFewerComments: function(e) {
        e && e.preventDefault();
        var $li = $(e.target).closest("li");
        this.$(".has_more_comments").removeClass("hidden");
        this.$(".more_comments").addClass("hidden");
    },

    additionalContext: function() {
        var comments = this.collection || [];
        return {
            comments: comments.slice(0, 3),
            moreComments: comments.slice(3),
            hasMoreComments: Math.max(0, comments.length - 3)
        }
    }
});