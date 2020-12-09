/* jshint node: true */
/* global require, module */
"use strict";

var reloadExtensions = ["js", "ts", "hbs"];

var reloadJsPattern = new RegExp(".(" + reloadExtensions.join("|") + ")$");

module.exports = function HotReloader(options) {
  var fsWatcher = options.watcher;
  var ui = options.ui;
  var _isRunning = false;
  var lsProxy = options.ssl ? require("https") : require("http");

  var liveReloadHostname = [
    options.ssl ? "https://" : "http://",
    options.liveReloadHost || options.host || "localhost",
    ":",
    options.liveReloadPort].join("")

  var liveReloadBaseUrl = new URL(liveReloadHostname);
  liveReloadBaseUrl.pathname = options.liveReloadPrefix;
  liveReloadBaseUrl = liveReloadBaseUrl.toString();

  function shouldReload(filePath) {
    return filePath.match(reloadJsPattern);
  }

  async function fileDidChange(results) {
    var filePath = results.filePath || "";

    ui.writeLine(filePath);

    if (shouldReload(filePath)) {
      ui.writeLine("Reloading " + filePath + " only");
      try {
        var url = new URL(`${options.liveReloadPrefix}/changed?files=` + filePath, liveReloadBaseUrl);
        ui.writeLine("GET " + url.toString());
        const { hostname, pathname, search, port } = url;
        const path = `${pathname}${search}`;
        await new Promise((resolve, reject) => {
          lsProxy.get({ hostname, port, path, rejectUnauthorized: false }, resolve).on('error', e => {
            // eslint-disable-next-line no-console
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
