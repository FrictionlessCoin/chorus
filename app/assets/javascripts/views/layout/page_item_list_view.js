//= require ./item_wrapper_view

chorus.views.PageItemList = chorus.views.Base.extend({
    constructorName: "PageItemListView",
    additionalClass: "selectable list",
    tagName: "ul",
    templateName: "no_template",
    persistent: false,
    suppressRenderOnChange: true,

    events: {
        "click  li input[type=checkbox]": "checkboxClicked",
        "click .item_wrapper": "listItemClicked"
    },

    checkboxClicked: function(e) {
        e.stopPropagation();
        var clickedBox = $(e.currentTarget);
        var clickedLi = clickedBox.closest(".item_wrapper");
        var index = this.$(".item_wrapper").index(clickedLi);
        var model = this.collection.at(index);
        var willBeChecked = !this.findSelectedModel(model);

        if(willBeChecked) {
            var modelsToAdd = [model];
            if(e.shiftKey && this.previousIndex >= 0) {
                var min = _.min([this.previousIndex, index]);
                var max = _.max([this.previousIndex, index]);
                modelsToAdd = this.collection.models.slice(min, max + 1);
            }
            this.addModelsToSelection(modelsToAdd);
            this.previousIndex = index;
        } else {
            this.unselectItem(model);
        }

        this.sendCheckedEvents();
    },

    setup: function() {
        this.eventName = this.options.eventName || this.options.entityType;
        this.entityViewType = this.options.entityViewType;
        this.listItemOptions = this.options.listItemOptions || {};
        this.multiListMode = this.options.multiListMode;

        if(this.options.entityType) {
            this.selectedModels = this.options.selectedModels || this.collection.clone().reset();
        } else {
            this.selectedModels = this.options.selectedModels || new chorus.collections.Base();
        }

        this.subscribePageEvent("selectAll", this.selectAll);
        this.subscribePageEvent("selectNone", this.selectNone);
        this.subscribePageEvent("clear_selection", this.clearSelection);
        this.subscribePageEvent("checked", this.checkSelectedModels);

        this.selectedIndex = 0;
        this.collection.bind("paginate", function() {
            this.selectedIndex = 0;
        }, this);

        if(this.eventName) {
            this.subscribePageEvent(this.eventName + ":search", function() {
                this.selectItem(this.$(">li:not(:hidden)").eq(0));
            });
        }

        this.subscribePageEvent("selected", this.updateSelection);
    },

    postRender: function() {
        _.each(this.liViews, function(liViews) {
            liViews.teardown();
        });
        this.liViews = [];
        this.collection.each(function(model) {
            var view = this.makeListItemView(model);
            $(this.el).append(view.render().el);
            this.liViews.push(view);
            this.registerSubView(view);
        }, this);

        this.checkSelectedModels();

        this.selectItem(this.$(">li").eq(this.selectedIndex));
    },

    listItemClicked: function(e) {
        this.selectItem($(e.currentTarget));
    },

    checkSelectedModels: function() {
        var liItems = this.$(".item_wrapper");
        this.collection.each(function(model, i) {
            var selected = !!this.findSelectedModel(model);
            liItems.eq(i).find("input[type=checkbox]").prop("checked", selected);
            liItems.eq(i).toggleClass("checked", selected);
        }, this);
    },

    addModelsToSelection: function(models) {
        this.selectedModels.add(_.filter(models, function(model) {
            return !this.findSelectedModel(model);
        }, this));
    },

    findSelectedModel: function(model) {
        return this.selectedModels.findWhere({
            entityType: model.get('entityType'),
            id: model.get('id')
        });
    },

    selectAll: function() {
        this.selectedModels.add(this.collection.models);
        chorus.PageEvents.trigger("checked", this.selectedModels);
        chorus.PageEvents.trigger(this.eventName + ":checked", this.selectedModels);
    },

    selectNone: function() {
        this.selectedModels.reset();
        chorus.PageEvents.trigger("checked", this.selectedModels);
        chorus.PageEvents.trigger(this.eventName + ":checked", this.selectedModels);
    },

    clearSelection: function(model) {
        this.unselectItem(model);
        delete this.selectedIndex;
        this.$(">li").removeClass("selected");
    },

    selectItem: function($target) {
        var $lis = this.$(">li");
        var preSelected = $target.hasClass("selected");

        $lis.removeClass("selected");
        $target.addClass("selected");

        this.selectedIndex = $lis.index($target);
        if(this.selectedIndex >= 0) {
            if(!preSelected) {
                this.itemSelected(this.collection.at(this.selectedIndex));
            }
        } else {
            this.selectedIndex = 0;
            this.itemDeselected();
        }
    },

    unselectItem: function(model) {
        if(model) {
            var match = this.findSelectedModel(model);
            this.selectedModels.remove(match);
        }
        delete this.previousIndex;
        this.sendCheckedEvents();
    },

    itemSelected: function(model) {
        var eventName = this.eventName || model.eventType();
        if(eventName) {
            this.lastEventName = eventName;
            chorus.PageEvents.trigger(eventName + ":selected", model);
            chorus.PageEvents.trigger("selected", model);
        }
    },

    itemDeselected: function() {
        if(this.lastEventName) {
            chorus.PageEvents.trigger(this.lastEventName + ":deselected");
        }
    },

    updateSelection: function(selectedModel) {
        delete this.selectedIndex;
        this.collection.each(function(model, index) {
            var selected = _.isEqual(
                _.pick(model.attributes, 'id', 'entityType'),
                _.pick(selectedModel.attributes, 'id', 'entityType'));
            this.$(">li").eq(index).toggleClass("selected", selected);
            if(selected) {
                this.selectedIndex = index;
            }
        }, this);
    },

    sendCheckedEvents: function() {
        chorus.PageEvents.trigger("checked", this.selectedModels);
        chorus.PageEvents.trigger(this.eventName + ":checked", this.selectedModels);

        var event = this.getSelectionEvent();
        event && chorus.PageEvents.trigger(event);
    },

    getSelectionEvent: function () {
        var element = this.multiListMode ? this.$el.closest(".content") : this.$el;
        return element.find("input[type=checkbox]:not(:checked)").length === 0 ? "selectAll" : "unselectAny";
    },

    makeListItemView: function(model) {
        var itemView = new this.entityViewType(_.extend({model: model, checkable: true}, this.listItemOptions));
        itemView.listenTo(model, 'change:tags', itemView.render);
        return new chorus.views.ItemWrapper({itemView: itemView});
    }
});
