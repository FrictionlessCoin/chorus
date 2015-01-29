chorus.Mixins.HdfsViews = {
    ellipsizePath: function() {
        var dir = this.hdfsEntry.get("path");
        if(!dir) {
            return '';
        }

        if(this.hdfsEntry.name() === "/") {
            dir = "";
        } else if(!dir.match(/\/$/)) {
            dir += '/';
        }
        var path = dir + this.hdfsEntry.name();
        var folders = path.split('/');
        if(folders.length > 3) {
            return "/" + folders[1] + "/…/" + folders[folders.length - 1];
        } else {
            return path;
        }
    }
};