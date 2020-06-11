/* jshint node: true */
/* global require, module */
"use strict";

var path = require("path");
var reloadExtensions = ["js", "ts", "hbs"];

// eslint-disable-next-line
var reloadJsPattern = new RegExp(".(" + reloadExtensions.join("|") + ")$");

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

	var muAppJSPath =  ["routes"].concat(supportedTypes)
    .map(function(reloadType) {
      return path.join(options.project.root, "src", "ui", reloadType, "*");
    })
	.join("||^");

  var appJSPattern = new RegExp("^" + appJSPath);
  var muAppJSPattern =  new RegExp("^" + muAppJSPath);
  var appJSResource = options.project.pkg.name + ".js";
  var liveReloadHostname = [
    options.ssl ? "https://" : "http://",
    options.liveReloadHost || options.host || "localhost",
    ":",
    options.liveReloadPort +
      (options.liveReloadPrefix ? "/" + options.liveReloadPrefix : "")
  ].join("");

  function shouldReload(filePath) {
    return filePath.match(reloadJsPattern);
  }

  function getReloadResource(filePath) {
    return (filePath.match(appJSPattern) || filePath.match(muAppJSPattern)) ? appJSResource : "vendor.js";
  }

  async function fileDidChange(results) {
    var filePath = results.filePath || "";

    ui.writeLine(filePath);

    if (shouldReload(filePath)) {
      // eslint-disable-next-line
      var reloadResource = getReloadResource(filePath);
      //   console.log("reloadResource", reloadResource);
      var url;
      ui.writeLine("Reloading " + filePath + " only");
      try {
        url = liveReloadHostname + "/changed?files=" + filePath;
        ui.writeLine("GET " + url);
        const { hostname, pathname, search, port } = new URL(url);
        const path = `${pathname}${search}`;
        await new Promise((resolve, reject) => {
          lsProxy.get({ hostname, port, path, rejectUnauthorized: false }, resolve).on('error', e => {
            console.error(e);
            reject(e);
          });
        });
      } catch (e) {
        ui.writeLine("Hot reloading error: " + e);
      }
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
