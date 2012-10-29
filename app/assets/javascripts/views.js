chorus.views.Bare = Backbone.View.include(
    chorus.Mixins.Events
).extend({
        constructorName: "View",

        initialize: function initialize() {
            this.bindings = new chorus.BindingGroup(this);
            this.preInitialize.apply(this, arguments);
            chorus.viewsToTearDown.push(this);
            this.subViewObjects = [];

            this.setup.apply(this, arguments);
            this.bindCallbacks();
            this.bindHotkeys();

            this.verifyResourcesLoaded(true);
        },

        preInitialize: $.noop,
        setup: $.noop,
        postRender: $.noop,
        bindCallbacks: $.noop,
        preRender: $.noop,
        setupSubviews: $.noop,
        resourcesLoaded: $.noop,
        displayLoadingSection: $.noop,

        registerSubView: function(view) {
            if (_.indexOf(this.subViewObjects, view) === -1) {
                this.subViewObjects.push(view);
                chorus.unregisterView(view);

                view.parentView = this;
            }
        },

        getSubViews: function() {
            return this.subViewObjects;
        },

        teardown: function(preserveContainer) {
            chorus.unregisterView(this);
            this.unbind();
            this.bindings.removeAll();
            delete this.bindings.defaultContext;
            this.requiredResources.cleanUp();
            if(preserveContainer) {
                $(this.el).children().remove();
                $(this.el).html("");
            } else {
                $(this.el).remove();
            }

            while(!_.isEmpty(this.subViewObjects)) {
                var subViewObject = this.subViewObjects.pop();
                subViewObject.teardown();
            }

            if(this.parentView) {
                var subViewObjects = this.parentView.subViewObjects;
                var index = subViewObjects.indexOf(this);
                if(index > -1) subViewObjects.splice(index, 1);
                delete this.parentView
            }
        },

        bindHotkeys: function() {
            var keydownEventName = "keydown." + this.cid;
            _.each(this.hotkeys, _.bind(function(eventName, hotkey) {
                this.bindings.add($(document), keydownEventName, chorus.hotKeyMeta + '+' + hotkey, function(event) {
                    chorus.PageEvents.broadcast(eventName, event);
                });
            }, this));

            if (this.hotkeys) {
                chorus.afterNavigate(function() {
                    $(document).unbind(keydownEventName);
                });
            }
        },

        context: {},
        subviews: {},

        _configure: function(options) {
            this._super('_configure', arguments);

            this.requiredResources = new chorus.RequiredResources();
            this.requiredResources.bind('add', function(resource) {
                resource.bindOnce('loaded', this.verifyResourcesLoaded, this);
            }, this);
            this.requiredResources.reset(options.requiredResources);
        },

        createModal: function(e, modalType) {
            e.preventDefault();
            var button = $(e.target).closest("button, a");
            var modalClass = chorus[modalType + 's'][button.data(modalType)];
            var options = _.extend(button.data(), { pageModel: this.model, pageCollection: this.collection });
            var modal = new modalClass(options);
            modal.launchModal();
        },

        createDialog: function(e) {
            this.createModal(e, "dialog");
        },

        createAlert: function(e) {
            this.createModal(e, "alert");
        },

        verifyResourcesLoaded: function(preventRender) {
            if (this.requiredResources.length == 0) {
                return;
            }
            if (this.requiredResources.allLoaded()) {
                this.resourcesLoaded();

                if (!preventRender) {
                    this.render();
                }
            }
        },

        render: function render() {
            this.preRender();

            var evaluatedContext = {};
            if (!this.displayLoadingSection()) {
                if (!this.requiredResources.allLoaded()) {
                    return this;
                }
                // The only template rendered when loading section is displayed is the loading section itself, so no context is needed.
                evaluatedContext = _.isFunction(this.context) ? this.context() : this.context;
            }

            $(this.el).html(this.template(evaluatedContext))
                .addClass(this.className || "")
                .addClass(this.additionalClass || "")
                .attr("data-template", this.templateName);
            this.renderSubviews();
            this.postRender($(this.el));
            this.renderHelps();
            chorus.PageEvents.broadcast("content:changed");
            return this;
        },

        renderSubviews: function() {
            this.setupSubviews();
            var subviews;
            if (this.displayLoadingSection()) {
                subviews = {".loading_section": "makeLoadingSectionView"};
            } else {
                subviews = this.subviews
            }

            _.each(subviews, function(property, selector) {
                var subview = this.getSubview(property);
                if(subview) this.registerSubView(subview);
                this.renderSubview(property, selector);
            }, this);
        },

        renderSubview: function(property, selector) {
            var view = this.getSubview(property);
            if (view) {
                if (!selector) {
                    _.each(this.subviews, function(value, key) {
                        if (value == property) {
                            selector = key;
                        }
                    })
                }
                var element = this.$(selector);
                if (element.length) {
                    if (element[0] !== view.el) {
                        var id = element.attr("id"), klass = element.attr("class");
                        $(view.el).attr("id", id);
                        $(view.el).addClass(klass);
                        element.replaceWith(view.el);
                    }

                    if (!view.requiredResources || view.requiredResources.allLoaded()) {
                        view.render()
                    }
                    view.delegateEvents();
                }
            }
        },

        getSubview: function(property) {
            return _.isFunction(this[property]) ? this[property]() : this[property];
        },

        renderHelps: function() {
            var classes;
            var helpElements = this.$(".help");
            if (helpElements.length) {
                if ($(this.el).closest(".dialog").length) {
                    classes = "tooltip-help tooltip-modal";
                } else {
                    classes = "tooltip-help";
                }
            }
            _.each(helpElements, function(element) {
                $(element).qtip({
                    content: $(element).data("text"),
                    show: 'mouseover',
                    hide: {
                        delay: 1000,
                        fixed: true,
                        event: 'mouseout'
                    },
                    position: {
                        viewport: $(window),
                        my: "bottom center",
                        at: "top center"
                    },
                    style: {
                        classes: classes,
                        tip: {
                            width: 20,
                            height: 13
                        }
                    }
                });
            });
        },

        template: function template(context) {
            if (this.displayLoadingSection()) {
                return '<div class="loading_section"/>';
            } else {
                return Handlebars.helpers.renderTemplate(this.templateName, context).toString();
            }
        },

        makeLoadingSectionView: function() {
            var opts = _.extend({}, this.loadingSectionOptions());
            return new chorus.views.LoadingSection(opts);
        },

        loadingSectionOptions: function() {
            return { delay: 125 };
        },

        setupScrolling: function(selector_or_element, options) {
            _.defer(_.bind(function() {
                var el = this.$(selector_or_element);

                if (el.length > 0) {

                    var alreadyInitialized = el.data("jsp");

                    el.jScrollPane(options);
                    el.find('.jspVerticalBar').hide();
                    el.find('.jspHorizontalBar').hide();

                    el.bind("jsp-scroll-y", _.bind(function() { this.trigger("scroll"); }, this));

                    this.scrollHandle && chorus.PageEvents.unsubscribe(this.scrollHandle);
                    this.scrollHandle = chorus.PageEvents.subscribe("content:changed", function() { this.recalculateScrolling(el) }, this);

                    if (!alreadyInitialized) {
                        el.addClass("custom_scroll");
                        el.unbind('hover').hover(function() {
                            el.find('.jspVerticalBar, .jspHorizontalBar').fadeIn(150)
                        }, function() {
                            el.find('.jspVerticalBar, .jspHorizontalBar').fadeOut(150)
                        });

                        el.find('.jspContainer').unbind('mousewheel', this.onMouseWheel).bind('mousewheel', this.onMouseWheel);

                        if (chorus.page && chorus.page.bind) {
                            if(this.resizeCallback) {
                                this.bindings.remove(chorus.page, "resized", this.resizeCallback)
                            }
                            this.resizeCallback = function() { this.recalculateScrolling(el) };
                            this.bindings.add(chorus.page, "resized", this.resizeCallback, this);
                        }

                    }
                }
            }, this))
        },

        onMouseWheel: function(event, d) {
            event.preventDefault();
        },

        recalculateScrolling: function(el) {
            var elements = el ? [el] : this.$(".custom_scroll");
            _.each(elements, function(el) {
                el = $(el)
                var api = el.data("jsp");
                if (api) {
                    _.defer(_.bind(function() {
                        api.reinitialise();
                        if (!api.getIsScrollableH() && api.getContentPositionX() > 0) {
                            el.find(".jspPane").css("left", 0)
                        }
                        if (!api.getIsScrollableV() && api.getContentPositionY() > 0) {
                            el.find(".jspPane").css("top", 0)
                        }
                        el.find('.jspVerticalBar').hide();
                        el.find('.jspHorizontalBar').hide();
                    }, this));
                }
            })
        }
    }, {
        extended: function(subclass) {
            var proto = subclass.prototype;
            if (proto.templateName) {
                proto.className = proto.templateName.replace(/\//g, "_");
            }

            _.defaults(proto.events, this.prototype.events);
        }
    });

chorus.views.Bare.extend = chorus.classExtend;

chorus.views.Base = chorus.views.Bare.extend({
    makeModel: $.noop,
    collectionModelContext: $.noop,
    additionalContext: function() {
        return {}
    },

    preInitialize: function() {
        this.makeModel.apply(this, arguments);
        this.resource = this.model || this.collection;
    },

    bindCallbacks: function() {
        if (this.resource) {
            this.bindings.add(this.resource, "saveFailed validationFailed", this.showErrors);
            this.bindings.add(this.resource, "validated", this.clearErrors);
            if (!this.persistent) {
                this.bindings.add(this.resource, "change reset", this.render);
            }
        }
    },

    unbindCallbacks: function() {
        if(this.resource) {
            this.bindings.remove(this.resource, "saveFailed", this.showErrors);
            this.bindings.remove(this.resource, "validationFailed", this.showErrors);
            this.bindings.remove(this.resource, "validated", this.clearErrors);
            this.bindings.remove(this.resource, "change", this.render);
            this.bindings.remove(this.resource, "reset", this.render);
        }
    },

    context: function context(resource) {
        resource = resource || this.resource;
        var ctx;
        var self = this;

        if (resource) {
            ctx = _.clone(resource.attributes);
            ctx.resource = resource;
            ctx.loaded = resource.loaded;
            if (this.collection) {
                ctx.models = _.map(this.collection.models, function(model) {
                    return _.extend({model: model}, model.attributes, self.collectionModelContext(model));
                });
            }
            if (resource.serverErrors) ctx.serverErrors = resource.serverErrors;
            $.extend(ctx, this.additionalContext(ctx));
        } else {
            ctx = this.additionalContext({})
        }

        ctx.view = self;
        return ctx;
    },

    render: function() {
        var result = this._super('render', arguments);
        chorus.placeholder(this.$("input[placeholder], textarea[placeholder]"));
        return result;
    },

    displayLoadingSection: function() {
        if (!this.useLoadingSection) {
            return false;
        }
        if (this.requiredResources.length > 0) {
            return !this.requiredResources.allLoaded();
        } else {
            return this.resource && !this.resource.loaded;
        }
    },

    showErrors: function(model) {
        var self = this;

        var isModal = $(this.el).closest(".dialog").length;

        this.clearErrors();

        if (!model) {
            model = this.resource
        }
        _.each(model.errors, function(val, key) {
            var $input = self.$("input[name=" + key + "], form textarea[name=" + key + "]");
            self.markInputAsInvalid($input, val, isModal);
        });

        this.$(".errors").replaceWith(Handlebars.VM.invokePartial(Handlebars.partials.errorDiv, "errorDiv", this.context(model), Handlebars.helpers, Handlebars.partials));
    },

    markInputAsInvalid: function($input, message, isModal) {
        var classes = isModal ? "tooltip-error tooltip-modal" : "tooltip-error";
        $input.addClass("has_error");
        $input.qtip({
            content: {
                text: message
            },
            show: 'mouseover focus',
            hide: 'mouseout blur',
            style: {
                classes: classes,
                tip: {
                    width: 12,
                    height: 12
                }
            },
            position: {
                my: "left center",
                at: "right center",
                container: this.el
            }
        });
    },

    clearErrors: function() {
        this.clearPopupErrors();
        this.$(".errors").empty();
    },

    clearPopupErrors: function() {
        var errors = this.$(".has_error");
        errors.qtip("destroy");
        errors.removeData("qtip");
        errors.removeClass("has_error");
    },

    setModel: function(model) {
        this.unbindCallbacks();
        this.resource = this.model = model;
        this.bindCallbacks();
    }
});

chorus.views.MainContentView = chorus.views.Base.extend({
    constructorName: "MainContentView",
    templateName: "main_content",

    setup: function(options) {
        options = options || {}
        this.contentHeader = this.contentHeader || options.contentHeader;
        this.contentDetails = this.contentDetails || options.contentDetails;
        this.content = this.content || options.content;
        this.contentFooter = this.contentFooter || options.contentFooter;
    },

    subviews: {
        ".content_header > div": "contentHeader",
        ".content_details > div": "contentDetails",
        ".content > div": "content",
        ".content_footer > div": "contentFooter"
    },

    postRender: function() {
        if (!this.contentDetails) this.$(".content_details").addClass("hidden");
        if (!this.content)        this.$(".content").addClass("hidden");
        if (!this.contentFooter)  this.$(".content_footer").addClass("hidden");
    }
});

chorus.views.ListHeaderView = chorus.views.Base.extend({
    templateName: "default_content_header",

    context: function() {
        var ctx = this.options;
        return _.extend({}, ctx, this.additionalContext());
    },

    postRender: function() {
        var self = this;
        if (this.options.linkMenus) {
            _.each(this.options.linkMenus, function(menuOptions, menuKey) {
                var menu = new chorus.views.LinkMenu(menuOptions);
                self.$(".menus").append(
                    menu.render().el
                )
                $(menu.el).addClass(menuKey);
                menu.bind("choice", function(eventType, choice) {
                    self.trigger("choice:" + eventType, choice);
                })
            })
        }
    }
});

chorus.views.MainContentList = chorus.views.MainContentView.extend({
    setup: function(options) {
        var modelClass = options.modelClass;
        var collection = this.collection;
        this.content = new chorus.views[modelClass + "List"](_.extend({collection: collection}, options.contentOptions));

        this.contentHeader = options.contentHeader || new chorus.views.ListHeaderView({title: options.title || (!options.emptyTitleBeforeFetch && (modelClass + "s")), linkMenus: options.linkMenus, imageUrl: options.imageUrl, sandbox: options.sandbox})

        if (options.hasOwnProperty('persistent')) {
            this.persistent = options.persistent;
        }

        if (options.contentDetails) {
            this.contentDetails = options.contentDetails;
        } else {
            this.contentDetails = new chorus.views.ListContentDetails(
                _.extend({
                    collection: collection,
                    modelClass: modelClass,
                    buttons: options.buttons,
                    search: options.search && _.extend({list: $(this.content.el)}, options.search)
                }, options.contentDetailsOptions));

            this.contentFooter = new chorus.views.ListContentDetails({
                collection: collection,
                modelClass: modelClass,
                hideCounts: true,
                hideIfNoPagination: true
            });
        }
    },
    additionalClass: "main_content_list"
});
