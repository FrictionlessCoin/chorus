chorus.views.JobItem = chorus.views.Base.extend({
    constructorName: "JobItemView",
    templateName:"job_item",

    events: {
        'click a.last_run_date': 'launchLastRunJobResultDetails'
    },

    setup: function() {
        this._super("setup", arguments);
        this.listenTo(this.model, "invalidated", function() { this.model.fetch(); });
    },

    additionalContext: function () {
        return {
            iconUrl: this.iconUrl(),
            url: this.model.showUrl(),
            frequency: this.model.frequency(),
            stateKey: "job.state." + this.jobStateKey(),
            lastRunLinkKey: this.model.lastRunLinkKey(),
            running: this.model.isRunning()
        };
    },

    postRender: function() {
        this.$(".loading_spinner").startLoading(null, {color: '#959595'});
    },

    jobStateKey: function () {
        if (this.model.isRunning()) {
            return 'running';
        } else if (this.model.isStopping()) {
            return 'stopping';
        } else if (this.model.runsOnDemand()) {
            return 'on_demand';
        }
        return this.model.get('enabled') ? 'scheduled' : 'disabled';
    },

    iconUrl: function () {
        var icon = (this.model.get('enabled') || this.model.runsOnDemand()) ? 'job.png' : 'job-disabled.png';
        return "/images/jobs/" + icon;
    },

    launchLastRunJobResultDetails: function (e) {
        e && e.preventDefault();
        new chorus.dialogs.JobResultDetail({job: this.model}).launchModal();
    }
});