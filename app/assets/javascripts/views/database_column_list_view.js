chorus.views.DatabaseColumnList = chorus.views.Base.extend({
    constructorName: "DatabaseColumnListView",
    tagName:"ul",
    templateName:"database_column_list",
    additionalClass: "selectable list",
    events:{
        "click li":"selectColumnClick"
    },
    selectMulti: false,

    setup:function () {
        this.subscriptions.push(chorus.PageEvents.subscribe("column:removed", this.deselectColumn, this));
        this.subscriptions.push(chorus.PageEvents.subscribe("column:deselected", this.deselectColumn, this));
        this.subscriptions.push(chorus.PageEvents.subscribe("column:select_all", this.selectAll, this));
        this.subscriptions.push(chorus.PageEvents.subscribe("column:select_none", this.selectNone, this));
    },

    postRender:function () {
        if(!this.selectMulti) {
            this.toggleColumnSelection(this.$("li:eq(0)"));
        }
    },

    collectionModelContext:function (model) {
        return {
            typeClass:model.get("typeClass"),
            typeString: model.get("dataType")
        }
    },

    selectNone: function() {
        if (this.selectMulti) {
            _.each(this.$("li"), function(li) {
                this.toggleColumnSelection($(li), false);
            }, this);
        } else {
            this.toggleColumnSelection(this.$("li:eq(0)"));
        }
    },

    selectAll : function() {
        _.each(this.$("li"), function(li) {
            this.toggleColumnSelection($(li), true);
        }, this);
    },

    selectColumnClick: function(e) {
        this.toggleColumnSelection($(e.target).closest("li"));
    },

    toggleColumnSelection:function ($selectedColumn, forceState) {
        if (this.selectMulti) {
            var turnOn = (arguments.length == 2) ? forceState : !$selectedColumn.is(".selected");
            var column = this.collection.getByCid($selectedColumn.data('cid'))
            if (turnOn) {
                $selectedColumn.addClass("selected");
                chorus.PageEvents.broadcast("column:selected", column);
            } else {
                chorus.PageEvents.broadcast("column:deselected", column);
            }
        } else {
            var $deselected = this.$("li.selected");
            $deselected.removeClass("selected");
            chorus.PageEvents.broadcast("column:deselected", this.collection.at(this.$("li").index($deselected)));

            $selectedColumn.addClass("selected");
            chorus.PageEvents.broadcast("column:selected", this.collection.at(this.$("li").index($selectedColumn)));
        }
    },

    deselectColumn: function(model) {
        if (this.selectMulti) {
            this.$("li").eq(this.collection.indexOf(model)).removeClass("selected");
        }
    }
});
