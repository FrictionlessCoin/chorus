// Part of OpenPhantomScripts
// http://github.com/mark-rushakoff/OpenPhantomScripts

// Copyright (c) 2012 Mark Rushakoff

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

var fs = require("fs");

var args = Array.prototype.slice.call(phantom.args, 0);
var port = args[0];

var color = true;
if (args[1] === 'nocolor') {
    color = false;
    args.splice(1, 1);
}

var filter = args[1];

var url = 'http://localhost:' + port + '?phantom=1&profile=1'

if (filter) {
    url += '&spec=' + encodeURIComponent(filter);
}

if (!parseInt(port) || args.length > 2) {
    console.log('Usage: run-jasmine.js PORT [spec_name_filter]');
    phantom.exit(1);
}

var page = require("webpage").create();

var stdout = fs.open("/dev/stdout", "w");
var stderr = fs.open("/dev/stderr", "w");

function printError(message) {
    stderr.write(message + "\n");
    stderr.flush();
}

page.onConsoleMessage = function(message) {
    stdout.write(message);
    stdout.flush();
}

var attachedDoneCallback = false;
page.onResourceReceived = function() {
    // Without this guard, I was occasionally seeing the done handler
    // pushed onto the array multiple times -- it looks like the
    // function was queued up several times, depending on the server.
    if (!attachedDoneCallback) {
        if (color) {
            page.evaluate(function(){
                window.colorizeJasmine = true;
            });
        }

        attachedDoneCallback = page.evaluate(function() {
            if (window.jasmine) {
                function colorlog (msg, color) {
                    if (window.colorizeJasmine) {
                        console.log(colorize(msg, color))
                    } else {
                        console.log(msg);
                    }
                }
                
                var reporter = {
                    failures: [],

                    numPassed: 0,
                    numFailed: 0,
                    numSkipped: 0,

                    reportRunnerStarting: function() {
                        this.startTime = (new Date()).getTime();
                    },

                    reportSpecStarting: function (spec) {
                        this.specStartTime = (new Date()).getTime();
                    },

                    reportSpecResults: function(spec) {
                        var results = spec.results();
                        if (results.skipped) {
                            this.numSkipped++;
                        } else if (results.passed()) {
                            this.numPassed++;
                            var timeTaken = (new Date()).getTime() - this.specStartTime;
                            if (timeTaken > 500) {
                                colorlog("O", 'red');
                            } else if (timeTaken > 250) {
                                colorlog("O", 'yellow');
                            } else if (timeTaken > 125) {
                                colorlog("-", 'yellow');
                            } else if (timeTaken > 50) {
                                colorlog("-", 'green');
                            } else {
                                colorlog(".", 'green');
                            }
                        } else {
                            this.numFailed++;

                            var name = spec.getFullName();
                            var failedExpectations = _.filter(spec.results().getItems(), function(item) {
                                return (item.type == 'expect') && item.passed && !item.passed()
                            });
                            var messages = _.map(failedExpectations, function(expectation) {
                                return expectation.message;
                            });
                            this.failures.push({ name: name, messages: messages });
                            console.log("\nFAILED", chorus.currentSpec, "\n");
                        }

                        var total = this.numPassed + this.numFailed;
                        if (total !== 0 && (total % 140) == 0) {
                            console.log("\n");
                        }
                    },

                    reportRunnerResults: function() {
                        var totalTime = (new Date()).getTime() - this.startTime;
                        var totalTests = (this.numPassed + this.numSkipped + this.numFailed);

                        _.each(this.failures, function(failure, i) {
                            console.log("\n\n" + (i+1) + ") " + failure.name);
                            _.each(failure.messages, function(message) {
                                console.log("\n" + message);
                            });
                        });

                        console.log("\n");
                        console.log("\nTests passed:  " + this.numPassed);
                        console.log("\nTests skipped: " + this.numSkipped);
                        console.log("\nTests failed:  " + this.numFailed);
                        console.log("\nTotal tests:   " + totalTests);
                        console.log("\nRuntime (ms):  " + totalTime);
                        console.log("\nRuntime (min): " + ((totalTime / 1000) / 60).toFixed(3));
                        console.log("\n\n");

                        window.phantomComplete = true;
                        window.phantomResults = {
                            numPassed: this.numPassed,
                            numSkipped: this.numSkipped,
                            numFailed: this.numFailed,
                            totalTests: totalTests,
                            totalTime: totalTime
                        };
                    }
                };

                window.jasmine.getEnv().addReporter(reporter);

                return true;
            }

            return false;
        });
    }
}

page.open(url, function(success) {
    if (success === "success") {
        if (!attachedDoneCallback) {
            printError("Phantom callbacks not attached in time.  See http://github.com/mark-rushakoff/OpenPhantomScripts/issues/1");
            phantom.exit(1);
        }

        setInterval(function() {
            if (page.evaluate(function() { return window.phantomComplete; })) {
                var failures = page.evaluate(function() {return window.phantomResults.numFailed;});
                phantom.exit(failures);
            }
        }, 250);
    } else {
        printError("Failure opening " + url);
        phantom.exit(1);
    }
});
