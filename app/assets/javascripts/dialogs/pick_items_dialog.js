chorus.dialogs.PickItems = chorus.dialogs.Base.extend({
    constructorName: "PickItems",

    templateName: 'pick_items',
    useLoadingSection: true,
    additionalClass: "with_sub_header",

    events: {
        "click button.submit": "submitClicked",
        "dblclick li": "doubleClick",
        "textchange.filter .sub_header input:text": "search"
    },

    subviews: {
        ".pick_items_list": "pickItemsList"
    },

    setup: function() {
        if (!this.collection.comparator) {
            this.collection.comparator = this.collectionComparator;
        }

        this.onceLoaded(this.collection, this.sortCollection);

        this.pickItemsList = new chorus.views.PickItemsList({
            collection: this.collection,
            modelClass: this.modelClass,
            pagination: this.pagination,
            emptyListTranslationKey: this.emptyListTranslationKey,
            multiSelection: this.multiSelection,
            defaultSelection: this.options.defaultSelection
        });
        this.pickItemsList.baseCollectionModelContext = this.collectionModelContext; // forwarding inheritance on to pickItemsList

        this.listenTo(this.collection, 'searched', this.enableOrDisableSubmitButton);
        this.listenTo(this.pickItemsList, 'item:selected', this.itemSelected);
    },

    sortCollection: function() {
        this.collection.sort();
    },

    selectionFinished: function() {
        var listOrItem = this.selectedItem();
        var selectedItems = _.isArray(listOrItem) ? listOrItem : [listOrItem];

        this.trigger(this.selectedEvent, selectedItems);
        this.closeModal();
    },

    postRender: function() {
        chorus.addSearchFieldModifications(this.$('.sub_header input:text'));
        this.enableOrDisableSubmitButton();
    },

    collectionModelContext: function(model) {
        return {
            name: model.name(),
            imageUrl: ""
        };
    },

    collectionComparator: function(model) {
        return model.name().toLowerCase();
    },

    additionalContext: function() {
        return {
            placeholderTranslation: this.searchPlaceholderKey || "pickitem.dialog.search.placeholder",
            submitButtonTranslationKey: _.result(this, 'submitButtonTranslationKey') || "pickitem.dialog.submit"
        };
    },

    enableOrDisableSubmitButton: function() {
        if (this.$("li.selected").length > 0) {
            this.$('button.submit').removeAttr('disabled');
        } else {
            this.$('button.submit').attr('disabled', 'disabled');
        }
    },

    itemSelected: function(item) {
        this.trigger("item:selected", item);
        this.enableOrDisableSubmitButton();
    },

    selectedItem: function() {
        return this.pickItemsList.selectedItem();
    },

    doubleClick: function(e) {
        this.pickItemsList.itemClicked(e);
        this.submit();
    },

    search: function() {
        this.collection.search(this.$('.sub_header input:text').val());
    },

    submitClicked: function(e) {
        e.preventDefault();
        this.submit();
    },

    submit: function() {
        this.selectionFinished();
    }
});
