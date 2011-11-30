(function($) {
    chorus.models = {
        Collection: Backbone.Collection.extend({
            initialize: function(models, options) {
                this.attributes = options || {};
                this.setup(arguments);
            },

            setup: $.noop,

            url: function(options) {
                options = options || { rows : 50 }

                var url = "/edc/" + Handlebars.compile(this.urlTemplate)(this.attributes);

                var params = [];
                if (this.page) {
                    params.push("page=" + this.page);
                } else if (this.pagination) {
                    params.push("page=" + this.pagination.page)
                } else {
                    params.push("page=1")
                }

                params.push("rows=" + options.rows);

                if (this.sortIndex && this.sortOrder) {
                    params.push("sidx=" + this.sortIndex);
                    params.push("sord=" + this.sortOrder);
                }

                var paramsStr = params.join("&");
                if (url.indexOf('?') != -1) {
                    url = [url, paramsStr].join('&')
                } else {
                    url = [url, paramsStr].join('?')
                }

                return url;
            },

            fetchPage: function(page, options) {
                this.page = page;
                this.fetch(options);
            },

            fetchAll : (function() {
                var fetchPage = function(page) {
                    this.page = page;
                    this.fetch({
                        url : this.url({ rows: 1000 }),
                        silent: true,
                        add : page != 1,
                        success : function(collection, resp) {
                            if (resp.status == "ok") {
                                var total = parseInt(resp.pagination.total);
                                var page = parseInt(resp.pagination.page);
                                if (page >= total) {
                                    collection.trigger("reset", collection);
                                } else {
                                    fetchPage.call(collection, page + 1);
                                }
                            } else {
                                collection.trigger("reset", collection);

                            }
                        }
                    });
                };

                return function() {
                    fetchPage.call(this, 1);
                }
            })(),


            parse : function(data) {
                if (data.status == "needlogin") {
                    chorus.session.trigger("needsLogin");
                }
                this.pagination = data.pagination;
                this.loaded = true;
                return data.resource;
            },

            sortDesc : function(idx) {
                this._sort(idx, "desc")
            },

            sortAsc : function(idx) {
                this._sort(idx, "asc")
            }, 

            _sort : function(idx, order) {
                this.sortIndex = idx
                this.sortOrder = order
            }
        }),

        Base: Backbone.Model.extend({
            url: function(hidePrefix) {
                var prefix = (hidePrefix ? '' : "/edc/")
                return prefix + Handlebars.compile(this.urlTemplate)(this.attributes);
            },

            showUrl: function(hidePrefix) {
                if (!this.showUrlTemplate) {
                    throw "No showUrlTemplate defined";
                }

                var prefix = hidePrefix ? '' : "#/"
                return prefix + Handlebars.compile(this.showUrlTemplate)(this.attributes);
            },

            parse: function(data) {
                if (data.status == "needlogin") {
                    chorus.session.trigger("needsLogin");
                }
                this.loaded = true;
                if (data.status == "ok") {
                    return data.resource[0]
                } else {
                    this.serverErrors = data.message;
                }
            },

            save : function(attrs, options) {
                options || (options = {});
                var success = options.success;
                options.success = function(model, resp, xhr) {
                    var savedEvent = model.serverErrors ? "saveFailed" : "saved"
                    model.trigger(savedEvent, model, resp, xhr);
                    if (success) success(model, resp, xhr);
                };
                this.serverErrors = undefined;
                if (this.performValidation(this.attributes)) {
                    this.trigger("validated");
                    return Backbone.Model.prototype.save.call(this, attrs, options);
                } else {
                    this.trigger("validationFailed");
                    return false;
                }
            },

            destroy : function(options) {
                options || (options = {});
                if (this.isNew()) return this.trigger('destroy', this, this.collection, options);
                var model = this;
                var success = options.success;
                options.success = function(resp) {
                    if (!model.set(model.parse(resp), options)) return false;

                    if (resp.status == "ok") {
                        model.trigger('destroy', model, model.collection, options);
                    } else {
                        model.trigger('destroyFailed', model, model.collection, options);
                    }

                    if (success) success(model, resp);
                };

                return (this.sync || Backbone.sync).call(this, 'delete', this, options);
            },

            performValidation: function() {
                return true;
            },

            require : function(attr) {
                if (!this.get(attr)) {
                    this.errors[attr] = t("validation.required", this._textForAttr(attr));
                }
            },

            requirePattern : function(attr, regex) {
                var value = this.get(attr);
                if (!value || !value.match(regex)) {
                    this.errors[attr] = t("validation.required_pattern", this._textForAttr(attr));
                }
            },

            requireConfirmation : function(attr) {
                var value = this.get(attr);
                var conf = this.get(attr + "Confirmation");

                if (!value || !conf || value != conf) {
                    this.errors[attr] = t("validation.confirmation", this._textForAttr(attr));
                }
            },

            _textForAttr : function(attr) {
                return (this.attrToLabel && this.attrToLabel[attr]) ? t(this.attrToLabel[attr]) : attr;
            }
        })
    }
})(jQuery);
