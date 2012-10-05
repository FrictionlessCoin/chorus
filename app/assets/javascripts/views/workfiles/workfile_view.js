chorus.views.Workfile = chorus.views.Base.extend({
    templateName:"workfile",
    tagName: "li",

    subviews: {
        ".comment .body": "commentBody"
    },

    setupSubviews: function() {
        this.commentBody = new chorus.views.TruncatedText({
            model: this.model.lastComment(),
            attribute: "body",
            attributeIsHtmlSafe: true
        });
    },

    postRender: function() {
        $(this.el).attr('data-id', this.model.id);
    },

    additionalContext: function() {
        var ctx = new chorus.presenters.Attachment(this.model, { iconSize:'large' });

        ctx.activeWorkspace = this.options.activeWorkspace;

        ctx.tableauWorkbook = this.model.get('fileType') == 'tableau_workbook';
        ctx.tableauIcon = chorus.helpers.tableauIcon();

        var lastComment = this.model.lastComment();
        if (lastComment) {
            var date = Date.parseFromApi(lastComment.get("commentCreatedStamp"));

            ctx.lastComment = {
                body:lastComment.get("body"),
                creator:lastComment.author(),
                on:date && date.toString("MMM d")
            };

            ctx.otherCommentCount = parseInt(this.model.get("commentCount"), 10) - 1;
        }

        return ctx;
    }
});
