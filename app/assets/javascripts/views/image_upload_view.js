chorus.views.ImageUpload = chorus.views.Base.extend({
    constructorName: "ImageUploadView",
    templateName: "image_upload",

    additionalContext: function() {
        return {
            imageUrl: this.model.fetchImageUrl(),
            hasImage: this.model.hasImage(),
            addImageKey: this.addImageKey,
            changeImageKey: this.changeImageKey,
            editable: this.editable
        }
    },

    setup: function(options) {
        this.addImageKey = options.addImageKey;
        this.changeImageKey = options.changeImageKey;
        this.spinnerSmall = options.spinnerSmall;
        this.editable = options.editable || !("editable" in options);
        this.config = chorus.models.Config.instance();
    },

    postRender: function() {
        var self = this;

        var multipart = !window.jasmine;
        this.$("input[type=file]").fileupload({
            url: this.model.createImageUrl(),
            type: 'POST',
            add: fileSelected,
            done: uploadFinished,
            fail: uploadFailed,
            multipart: multipart,
            dataType: "text"
        });

        if (this.model.hasImage()) {
            this.$('img').removeClass('hidden')
        }

        function fileSelected(e, data) {
            self.uploadObj = data;
            if (self.spinnerSmall) {
                self.spinner = new Spinner({
                    lines: 14,
                    length: 8,
                    width: 3,
                    radius: 10,
                    color: '#000',
                    speed: 1,
                    trail: 75,
                    shadow: false
                }).spin(self.$(".spinner_container")[0]);
            } else {
                self.spinner = new Spinner({
                    lines: 30,
                    length: 40,
                    width: 6,
                    radius: 25,
                    color: '#000',
                    speed: 0.5,
                    trail: 75,
                    shadow: false
                }).spin(self.$(".spinner_container")[0]);
            }
            self.$("img").addClass("disabled");
            self.$("input[type=file]").prop("disabled", true);
            self.$("a.action").addClass("disabled");

            if (self.validFileSize()) {
                data.submit();
            } else {
                self.model.trigger("validationFailed");
                reEnableUpload();
            }
        }

        function reEnableUpload() {
            self.spinner.stop();
            self.$("img").removeClass("disabled");
            self.$("input[type=file]").prop("disabled", false);
            self.$("a.action").removeClass("disabled");

            chorus.updateCachebuster();
        }

        function uploadFinished(e, data) {
            reEnableUpload();
            var json = JSON.parse(data.result).response;
            delete self.resource.serverErrors;
            self.resource.trigger("validated");
            self.model.set({"image": json}, {silent: true})
            self.model.trigger("image:change");
            self.$("img").attr('src', self.model.fetchImageUrl());
            self.$("img").removeClass("hidden");
        }

        function uploadFailed(e, data) {
            reEnableUpload();
            if(data.result) {
                self.resource.serverErrors = JSON.parse(data.result).errors;
            }
            self.resource.trigger("saveFailed");
        }
    },

    validFileSize: function() {
        this.clearErrors();
        if (!this.model) return;
        var maxImageSize = this.model.maxImageSize();
        delete this.model.serverErrors;

        var valid = true;
        _.each( this.uploadObj.files, function(file) {
            if (file.size > (maxImageSize * 1024 * 1024) ) {
                this.model.serverErrors = {"fields":{"base":{"FILE_SIZE_EXCEEDED":{"count": maxImageSize }}}}
                this.showErrors(this.model);
                valid = false;
            }
        }, this);

        return valid;
    }
});
