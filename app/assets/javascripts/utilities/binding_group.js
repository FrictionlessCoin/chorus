chorus.BindingGroup = function chorus$BindingGroup(defaultContext) {
    this.defaultContext = defaultContext;
    this.bindings = [];
};

_.extend(chorus.BindingGroup.prototype, {
    add: function(eventSource, eventNameString, callback, context) {
        context = context || this.defaultContext;
        var eventNames = eventNameString.split(" ");

        _.each(eventNames, function(eventName) {
            if (!this.duplicate(eventSource, eventName, callback, context)) {
                this.bindings.push({
                    eventSource: eventSource,
                    eventName: eventName,
                    callback: callback,
                    context: context
                });

                eventSource.bind(eventName, callback, context);
            }
        }, this);

        if(eventSource.shouldTriggerImmediately &&
            eventSource.shouldTriggerImmediately(eventNameString)) {
            _.defer(function(){eventSource.trigger(eventNameString)});
        }
    },

    remove: function(eventSource, eventName, callback) {
        var matchingBindings = _.filter(this.bindings, function(binding) {
            return (eventSource ? binding.eventSource === eventSource : true) &&
                (eventName ? binding.eventName === eventName : true) &&
                (callback ? binding.callback === callback : true);
        }, this);

        _.each(matchingBindings, function(binding) {
            binding.eventSource.unbind(binding.eventName, binding.callback);
        });

        this.bindings = _.difference(this.bindings, matchingBindings);
    },

    removeAll: function() {
        this.remove();
    },

    duplicate: function(eventSource, eventName, callback, context) {
        return _.any(this.bindings, function(binding) {
            return binding.eventName === eventName &&
                binding.eventSource === eventSource &&
                binding.callback === callback &&
                binding.context === context
        });
    }
});
