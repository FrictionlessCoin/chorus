chorus.models = {
    Base: Backbone.Model.include(
        chorus.Mixins.Urls,
        chorus.Mixins.Events,
        chorus.Mixins.dbHelpers,
        chorus.Mixins.Fetching,
        chorus.Mixins.ServerErrors,
        chorus.Mixins.Taggable
    ).extend({
        constructorName: "Model",

        eventType: function() {
            return this.get('entityType');
        },

        isDeleted: function() {
            return this.get("isDeleted") && (this.get("isDeleted") === true || this.get("isDeleted") === "true");
        },

        //Build the url for a model based on the urlTemplate in the model's context.
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

        activities: function(opts) {
            if (!this._activities) {
                this._activities = new chorus.collections.ActivitySet([], _.extend({entity: this}, opts));
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
                model.handleRequestFailure("saveFailed", xhr, options);
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
            options.wait = true;
            var error = options.error;
            options.error = function(model, xhr) {
                model.handleRequestFailure("destroyFailed", xhr);
                if (error) error(model);
            };
            return Backbone.Model.prototype.destroy.call(this, options);
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

        //Client-side model validation used to verify that `attr` is present in `newAttrs` and is not blank/whitespace.
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
                return;
            }

            if (!value || !value.match(regex)) {
                this.setValidationError(attr, "validation.required_pattern", messageKey);
            }
        },

        requireValidEmailAddress:function (name, newAttrs, messageKey) {
            this.requirePattern(name, /[\w\.\-]+(\+[\w\-]*)?@([\w\-]+\.)+[\w\-]+/, newAttrs, messageKey);
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

            if (!value || !conf || value !== conf) {
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
            return this.get(this.nameAttribute || "name") || "";
        },

        displayName: function() {
            return this.name();
        },

        shortName: function(length) {
            length = length || 20;

            var name = this.name() || "";
            return (name.length < length) ? name : name.slice(0, length) + "…";
        },

        // TODO: use the helper in the template, not in the model
        highlightedName: function() {
            var highlightedModel = Handlebars.helpers.withSearchResults(this);
            return new Handlebars.SafeString(highlightedModel.name());
        },

        //When the `paramsToSave` attribute is set on a model, the JSON version of the model only includes the white-listed attributes.
        //When the `paramsToIgnore` attribute is set and `paramsToSave` is not, the JSON version of the model explicitly excludes the rejected attributes.
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
            attributes = _.inject(attributes, function(attrs, value, key) {
                if(value !== undefined && value !== null) {
                    attrs[key] = value;
                }
                return attrs;
            }, {});
            attributes = this.underscoreKeys(attributes);
            if (this.nestParams === false) {
                result = attributes;
            } else if (this.parameterWrapper) {
                result[this.parameterWrapper] = attributes;
            } else if (this.constructorName && this.constructorName !== "Model") {
                result[_.underscored(this.constructorName)] = attributes;
            } else {
                result = attributes;
            }
            return result;
        },

        _textForAttr: function(attr) {
            return (this.attrToLabel && this.attrToLabel[attr]) ? t(this.attrToLabel[attr]) : attr;
        },

        //return changes on this model since the last save.
        unsavedChanges: function() {
            this._savedAttributes = this._savedAttributes || {};
            var changes = {};
            var allKeys = _.union(_.keys(this._savedAttributes), _.keys(this.attributes));
            _.each(allKeys, function(key) {
                var oldValue = this._savedAttributes[key];
                var newValue = this.attributes[key];
                if(oldValue !== newValue) {
                    changes[key] = {oldValue: oldValue, newValue: newValue};
                }
            }, this);
            return changes;
        },

        set: function(key, val, options) {
            var attrs;
            if (key === null) return this;

            // Handle both `"key", value` and `{key: value}` -style arguments.
            if (_.isObject(key)) {
                attrs = key;
                options = val;
            } else {
                (attrs = {})[key] = val;
            }

            if (attrs instanceof Backbone.Model) attrs = attrs.attributes;

            //Can't use _super because we end up nesting set calls which _super doesn't handle
            var result = Backbone.Model.prototype.set.apply(this, [attrs, options]);
            if(attrs && attrs.completeJson) {
                this.loaded = true;
                this.statusCode = this.statusCode || 204;
            }
            return result;
        }
    })
};
chorus.models.Base.extend = chorus.classExtend;
