chorus.models = {
    Base: Backbone.Model.include(
        chorus.Mixins.Urls,
        chorus.Mixins.Events,
        chorus.Mixins.dbHelpers,
        chorus.Mixins.Fetching,
        chorus.Mixins.ServerErrors,
        chorus.Mixins.Tags
    ).extend({
        constructorName: "Model",

        isDeleted: function() {
            return this.get("isDeleted") && (this.get("isDeleted") == true || this.get("isDeleted") == "true");
        },

        url: function(options) {
            var template = _.isFunction(this.urlTemplate) ? this.urlTemplate(options) : this.urlTemplate;
            var context = _.extend({}, this.attributes, { entityId: this.entityId, entityType: this.entityType });
            var uri = new URI("/" + Handlebars.compile(template, {noEscape: true})(context));
            if (this.urlParams) {
                var params = _.isFunction(this.urlParams) ? this.urlParams(options) : this.urlParams;
                uri.addSearch(this.underscoreKeys(params));
            }
            if (!window.jasmine) { uri.addSearch({iebuster: chorus.cachebuster()}); }
            return uri.toString();
        },

        activities: function() {
            if (!this._activities) {
                this._activities = new chorus.collections.ActivitySet([], { entity: this } );
                this.bind("invalidated", this._activities.fetch, this._activities);
            }
            return this._activities;
        },

        save: function(attrs, options) {
            options || (options = {});
            var effectiveAttrs = attrs || {};
            this.beforeSave(effectiveAttrs, options);
            var success = options.success, error = options.error;
            options.success = function(model, data, xhr) {
                model.trigger("saved", model, data, xhr);
                if (success) success(model, data, xhr);
            };

            options.error = function(model, xhr) {
                model.handleRequestFailure("saveFailed", xhr, options)
                if (error) error(model, xhr);
            };

            if (this.performValidation(effectiveAttrs)) {
                this.trigger("validated");
                var attrsToSave = _.isEmpty(effectiveAttrs) ? undefined : effectiveAttrs;
                return Backbone.Model.prototype.save.call(this, attrsToSave, options);
            } else {
                this.trigger("validationFailed");
                return false;
            }
        },

        parse: function(data) {
            var attrs = this._super("parse", arguments);
            this._savedAttributes = _.clone(attrs);
            return attrs;
        },

        destroy: function(options) {
            options || (options = {});
            if (this.isNew()) return this.trigger('destroy', this, this.collection, options);
            var model = this;
            var success = options.success, error = options.error;
            options.success = function(data, status, xhr) {
                if (!model.set(model.parse(data, xhr), options)) return false;
                model.trigger("destroy", model, model.collection, options);
                if (success) success(model, data);
            };
            options.error = function(xhr) {
                model.handleRequestFailure("destroyFailed", xhr)
                if (error) error(model);
            };
            return (this.sync || Backbone.sync).call(this, 'delete', this, options);
        },

        declareValidations: $.noop,
        beforeSave: $.noop,

        shouldTriggerImmediately: function(eventName) {
            if (eventName === "loaded") {
                return this.loaded;
            }

            return false;
        },

        isValid: function() {
            return _.isEmpty(this.errors);
        },

        clearErrors: function() {
            this.errors = {};
        },

        performValidation: function(newAttrs) {
            this.errors = {};
            this.declareValidations(newAttrs);
            return _(this.errors).isEmpty();
        },

        setValidationError: function(attr, message_key, custom_key, vars) {
            vars = vars || {};
            vars["fieldName"] = this._textForAttr(attr);
            this.errors[attr] = this.errors[attr] || t((custom_key || message_key), vars);
        },

        require: function(attr, newAttrs, messageKey) {
            var value = newAttrs && newAttrs.hasOwnProperty(attr) ? newAttrs[attr] : this.get(attr);

            var present = value;

            if (value && _.isString(value) && _.stripTags(value).match(chorus.ValidationRegexes.AllWhitespace())) {
                present = false;
            }

            if (!present) {
                this.setValidationError(attr, "validation.required", messageKey);
            }
        },

        requirePositiveInteger: function(attr, newAttrs, messageKey) {
            var value = newAttrs && newAttrs.hasOwnProperty(attr) ? newAttrs[attr] : this.get(attr);
            var intValue = parseInt(value, 10);
            if (!intValue || intValue <= 0 || parseFloat(value) !== intValue) {
                this.setValidationError(attr, "validation.positive_integer", messageKey);
            }
        },

        requirePattern: function(attr, regex, newAttrs, messageKey, allowBlank) {
            var value = newAttrs && newAttrs.hasOwnProperty(attr) ? newAttrs[attr] : this.get(attr);
            value = value && value.toString();

            if (allowBlank && !value) {
                return
            }

            if (!value || !value.match(regex)) {
                this.setValidationError(attr, "validation.required_pattern", messageKey);
            }
        },

        requireValidEmailAddress:function (name, newAttrs, messageKey) {
            this.requirePattern(name, /[\w\.-]+(\+[\w-]*)?@([\w-]+\.)+[\w-]+/, newAttrs, messageKey);
        },

        requireConfirmation: function(attr, newAttrs, messageKey) {
            var confAttrName = attr + "Confirmation";
            var value, conf;

            if (newAttrs && newAttrs.hasOwnProperty(attr)) {
                if (newAttrs.hasOwnProperty(confAttrName)) {
                    value = newAttrs[attr];
                    conf = newAttrs[confAttrName];
                } else {
                    throw "newAttrs supplied an original value but not a confirmation";
                }
            } else {
                value = this.get(attr);
                conf = this.get(confAttrName);
            }

            if (!value || !conf || value != conf) {
                this.setValidationError(attr, "validation.confirmation", messageKey);
            }
        },

        requireIntegerRange: function(attr, min, max, newAttrs, messageKey) {
            var value = newAttrs && newAttrs.hasOwnProperty(attr) ? newAttrs[attr] : this.get(attr);
            var intValue = parseInt(value, 10);
            if (!intValue || intValue < min || intValue > max || parseFloat(value) !== intValue) {
                this.setValidationError(attr, "validation.integer_range", messageKey, { min: min, max: max });
            }
        },

        hasOwnPage: function() {
            return false;
        },

        highlightedAttribute: function(attr) {
            var highlightedAttrs = this.get("highlightedAttributes");
            if (highlightedAttrs && highlightedAttrs[attr]) {
                var attribute = highlightedAttrs[attr];
                return _.isArray(attribute) ? attribute[0] : attribute;
            }
        },

        name: function() {
            if (this.nameFunction) {
                return this[this.nameFunction]();
            }
            return this.get(this.nameAttribute || "name");
        },

        displayName: function() {
            return this.name();
        },

        shortName: function(length) {
            length = length || 20;

            var name = this.name() || "";
            return (name.length < length) ? name : name.slice(0, length) + "...";
        },

        highlightedName: function() {
            var highlightedModel = chorus.helpers.withSearchResults(this);
            return new Handlebars.SafeString(highlightedModel.name());
        },

        toJSON: function() {
            var paramsToSave = this.paramsToSave;
            var paramsToIgnore = this.paramsToIgnore;
            var result = {};
            var attributes = this._super("toJSON", arguments);
            if(paramsToSave) {
                var newAttributes = {};
                _.map(attributes, function(value, key) {
                    if(_.include(paramsToSave, key)) {
                        newAttributes[key] = value;
                    }
                });

                var functionParams = _.select(paramsToSave, function(paramToSave) {
                    return _.isFunction(this[paramToSave]);
                }, this);
                _.each(functionParams, function(functionParam) {
                    newAttributes[functionParam] = this[functionParam]();
                }, this);
                attributes = newAttributes;
            }
            else if(paramsToIgnore) {
                _.each(paramsToIgnore, function(rm_me) {
                   delete attributes[rm_me];
                });
            }
            attributes = this.underscoreKeys(attributes);
            if (this.parameterWrapper) {
                result[this.parameterWrapper] = attributes;
            } else if (this.constructorName && this.constructorName != "Model") {
                result[_.underscored(this.constructorName)] = attributes;
            } else {
                result = attributes;
            }
            return result;
        },

        _textForAttr: function(attr) {
            return (this.attrToLabel && this.attrToLabel[attr]) ? t(this.attrToLabel[attr]) : attr;
        },

        unsavedChanges: function() {
            this._savedAttributes = this._savedAttributes || {};
            var changes = {};
            var allKeys = _.union(_.keys(this._savedAttributes), _.keys(this.attributes));
            _.each(allKeys, function(key) {
                var oldValue = this._savedAttributes[key];
                var newValue = this.attributes[key];
                if(oldValue != newValue) {
                    changes[key] = {old: oldValue, new: newValue}
                }
            }, this);
            return changes;
        },

        set: function(attrs) {
            //Can't use _super because we end up nesting set calls which _super doesn't handle
            var result = Backbone.Model.prototype.set.apply(this, arguments);
            if(attrs && attrs.completeJson) {
                this.loaded = true;
            }
            return result
        }
    })
};
chorus.models.Base.extend = chorus.classExtend;

chorus.collections = {
    Base: Backbone.Collection.include(
        chorus.Mixins.Urls,
        chorus.Mixins.Events,
        chorus.Mixins.Fetching,
        chorus.Mixins.ServerErrors
    ).extend({
        constructorName: "Collection",

        initialize: function(models, options) {
            this.attributes = options || {};
            this.setup(arguments);
        },

        findWhere: function(attrs) {
            return this.find(function(model) {
                return _.all(attrs, function(value, key) {
                    return model.get(key) === value;
                });
            });
        },

        setup: $.noop,

        url: function(options) {
            options = _.extend({
                per_page: this.per_page || 50,
                page: 1
            }, options);

            var template = _.isFunction(this.urlTemplate) ? this.urlTemplate(options) : this.urlTemplate;
            var uri = new URI("/" + Handlebars.compile(template, {noEscape: true})(this.attributes));

            if (this.urlParams) {
                var params = _.isFunction(this.urlParams) ? this.urlParams(options) : this.urlParams;
                uri.addSearch(this.underscoreKeys(params));
            }

            uri.addSearch({
                page: options.page,
                per_page: options.per_page
            });

            if (options.order) {
                uri.addSearch({
                    order: _.underscored(options.order)
                });
            }

            if (this.order) {
                uri.addSearch({
                    order: _.underscored(this.order)
                });
            }

            // this ensures that IE doesn't cache 'needs_login' responses
            if (!window.jasmine) {
                uri.addSearch({iebuster: chorus.cachebuster()});
            }

            return uri.toString();
        },

        isDeleted: function() {
            return false;
        },

        shouldTriggerImmediately: function(eventName) {
            if (eventName === "loaded") {
                return this.loaded;
            }

            return false;
        },

        fetchPage: function(page, options) {
            if (options && options.per_page) {
                this.per_page = options.per_page;
                delete options.per_page;
            }
            var url = this.url({ page: page });
            options = _.extend({}, options, { url: url });
            this.fetch(options);
            this.trigger("paginate");
        },

        fetchAll: (function() {
            var fetchPage = function(page) {
                var self = this;
                this.fetch({
                    url: this.url({ page: page, per_page: 1000 }),
                    silent: true,
                    add: page != 1,
                    success: function(collection, data, xhr) {
                        var total = data.pagination ? parseInt(data.pagination.total) : 1;
                        var page = data.pagination ? parseInt(data.pagination.page) : 1;
                        if (page >= total) {
                            collection.trigger("reset", collection);
                            collection.trigger("loaded");
                        } else {
                            collection.loaded = false;
                            fetchPage.call(collection, page + 1);
                        }
                    },
                    error: function(collection) {
                        collection.trigger("reset", collection);
                        collection.trigger("loaded");
                    }
                });
            };

            return function() {
                fetchPage.call(this, 1);
            }
        })(),

        totalRecordCount: function() {
            return (this.pagination && this.pagination.records) || this.models.length;
        },

        sortDesc: function(idx) {
            // Not used. We only do ascending sort for now.
            this._sort(idx, "desc")
        },

        sortAsc: function(idx) {
            // We only support ascending sort at the moment.
            this._sort(idx, "asc")
        },

        _prepareModel: function(model, options) {
            var model = this._super("_prepareModel", arguments);
            this.attributes || (this.attributes = {});
            if (_.isFunction(this.modelAdded)) this.modelAdded(model);
            return model;
        },

        _sort: function(idx, order) {
            // order argument not used at this time. We only support ascending sort for now.
            this.order = idx
        }
    })
};
chorus.collections.Base.extend = chorus.classExtend;

chorus.collections.LastFetchWins = chorus.collections.Base.extend({
    lastFetchId: 0,

    makeSuccessFunction: function(options, success) {
        var fetchId = ++this.lastFetchId;
        return _.bind(function(collection, data) {
            if (fetchId != this.lastFetchId) return;
            var parentFunction = this._super("makeSuccessFunction", [options || {}, success]);
            return parentFunction(collection, data);
        }, this);
    }
});
