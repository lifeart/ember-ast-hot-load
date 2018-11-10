/* global require */

function createPlugin(appName, hotReloadService, rootURL) {
  function Plugin(window, host) {
    this.window = window;
    this.host = host;
  }
  Plugin.identifier = "ember-hot-reload";
  Plugin.version = "1.0"; // Just following the example, this might not be even used
  Plugin.prototype.reload = function(path) {
    const cancelableEvent = { modulePath: path, cancel: false, components: [] };
    hotReloadService.triggerInRunLoop("willLiveReload", cancelableEvent);
    if (cancelableEvent.cancel) {
      // Only hotreload if someone canceled the regular reload
      // Reloading app.js will fire Application.create unless we set this.
      window.runningTests = true;
      var tags = document.getElementsByTagName("script");
      for (var i = tags.length; i >= 0; i--) {
        if (
          tags[i] &&
          tags[i].getAttribute("src") != null &&
          tags[i].getAttribute("src").indexOf(appName) !== -1
        ) {
          tags[i].parentNode.removeChild(tags[i]);
        }
      }
      var script = document.createElement("script");
      script.onload = function() {
        setTimeout(function() {
          window.runningTests = false;
          hotReloadService.triggerInRunLoop("willHotReload", path);
        }, 10);
      };
      script.type = "text/javascript";
      script.src = `${rootURL}_hot-load/${appName}.js?t=${Date.now()}&components=${encodeURIComponent(cancelableEvent.components.join(','))}&file=${encodeURIComponent(path.split('\\').join('/'))}`;
      document.body.appendChild(script);

      return true;
    }
    return false;
  };
  Plugin.prototype.analyze = function() {
    return {
      disable: false
    };
  };

  return Plugin;
}

function lookup(appInstance, fullName) {
  if (appInstance.lookup) {
    return appInstance.lookup(fullName);
  }
  return appInstance.application.__container__.lookup(fullName);
}

function getAppName(appInstance) {
  if (appInstance.base && appInstance.base.name) {
    return appInstance.base.name;
  }
  // TODO: would this work in 2.4+?
  return (
    appInstance.application.name ||
    appInstance.application.modulePrefix ||
    appInstance.application.__registry__.resolver._configRootName ||
    "dummy"
  );
}

function getRootUrl(appName) {
  let modulePath = `${appName}/config/environment`;
  if (require._eak_seen[modulePath]) {
    return require(modulePath).default.rootURL || "/";
  }
  return "/";
}

export function initialize(appInstance) {
  if (!window.LiveReload) {
    return;
  }
  let appName = getAppName(appInstance);
  if (appName === "ember-ast-hot-load") {
    // TODO: find a better way to support other addons using the dummy app
    appName = "dummy";
  }
  if (!appName) {
    appName = "dummy";
  }
  let rootURL = getRootUrl(appName);
  const Plugin = createPlugin(
    appName,
    lookup(appInstance, "service:hot-loader"),
    rootURL
  );
  window.LiveReload.addPlugin(Plugin);
}

export default {
  name: "hot-loader-livereload-plugin",
  initialize
};
