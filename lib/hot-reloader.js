/* jshint node: true */
/* global require, module */
"use strict";

var path = require("path");
var reloadExtensions = ["js", "ts", "hbs"];

// eslint-disable-next-line
var reloadJsPattern = new RegExp(".(" + reloadExtensions.join("|") + ")$");

var noop = function() {
  //   console.log(...arguments);
};

module.exports = function HotReloader(options, supportedTypes) {
  var fsWatcher = options.watcher;
  var ui = options.ui;
  var _isRunning = false;
  var lsProxy = options.ssl ? require("https") : require("http");

  var appJSPath = supportedTypes
    .map(function(reloadType) {
      return path.join(options.project.root, "app", reloadType, "*");
    })
    .join("||^");
  var appJSPattern = new RegExp("^" + appJSPath);
  var appJSResource = options.project.pkg.name + ".js";
//   console.log(JSON.stringify(Object.keys(options)));
///_lr/changed?files=
  var liveReloadHostname = [
    options.ssl ? "https://" : "http://",
    options.liveReloadHost || options.host || "localhost",
    ":",
    options.liveReloadPort + ( options.liveReloadPrefix ? '/' + options.liveReloadPrefix : '')
  ].join("");
  //   console.log('liveReloadHostname',liveReloadHostname);
  function shouldReload(filePath) {
    // console.log("shouldReload", filePath);
    return filePath.match(reloadJsPattern);
  }

  function getReloadResource(filePath) {
    return filePath.match(appJSPattern) ? appJSResource : "vendor.js";
  }

  function fileDidChange(results) {
    var filePath = results.filePath || "";

    ui.writeLine(filePath);

    if (shouldReload(filePath)) {
      // eslint-disable-next-line
      var reloadResource = getReloadResource(filePath);
      //   console.log("reloadResource", reloadResource);
      var url;
      ui.writeLine("Reloading " + filePath + " only");
      // /_lr/livereload.js?port=4200&host=localhost
      try {
        url = liveReloadHostname + "/changed?files=" + filePath;
        ui.writeLine("GET" + url);
        lsProxy.get(url).on("error", noop);
      } catch (e) {
        ui.writeLine("unknown error hot reloading: " + e);
      }
    } else {
      //   console.log("not reload");
    }
  }

  function mergeReloadFilters() {
    options.project.liveReloadFilterPatterns.push(reloadJsPattern);
  }

  return {
    run: function() {
      if (!options.liveReload) {
        ui.writeLine("JSReloader is disabled");
        return;
      }

      if (this.isRunning()) {
        return;
      }

      ui.writeLine("JSReloader watches " + reloadExtensions.join("|"));
      if (fsWatcher) {
        mergeReloadFilters();
        fsWatcher.on("change", fileDidChange.bind(this));
        _isRunning = !_isRunning;
      }
    },

    isRunning: function() {
      return _isRunning;
    }
  };
};
