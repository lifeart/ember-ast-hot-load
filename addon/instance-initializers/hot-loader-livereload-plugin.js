/* global require */
function normalizeAppName(appName) {
  // it can be @foo/bar
  return appName.split('/').join('---');
}
function createPlugin(appName, hotReloadService, rootUrl, baseUrl) {
  function Plugin(window, host) {
    this.window = window;
    this.host = host;
  }
  Plugin.identifier = 'ember-hot-reload';
  Plugin.version = '1.0'; // Just following the example, this might not be even used
  Plugin.prototype.reload = function (path) {
    let crossOrigin;
    const cancelableEvent = { modulePath: path, cancel: false, components: [] };
    hotReloadService.triggerInRunLoop('willLiveReload', cancelableEvent);
    if (cancelableEvent.cancel) {
      // Only hotreload if someone canceled the regular reload
      // Reloading app.js will fire Application.create unless we set this.
      window.runningTests = true;
      var tags = document.getElementsByTagName('script');
      for (var i = tags.length; i >= 0; i--) {
        if (
          tags[i] &&
          tags[i].getAttribute('src') != null &&
          tags[i].getAttribute('src').indexOf(appName) !== -1
        ) {
          if (
            new RegExp(`${appName}\\.js$`).test(tags[i].getAttribute('src'))
          ) {
            crossOrigin = tags[i].getAttribute('crossorigin');
          }
          tags[i].parentNode.removeChild(tags[i]);
        }
      }
      var script = document.createElement('script');
      var hasLoadError = false;
      script.onload = function () {
        setTimeout(function () {
          window.runningTests = false;
          hotReloadService.triggerInRunLoop('willHotReload', path);
        }, 10);
      };
      const originalVendorFileURL = `${baseUrl}${rootUrl}assets/${appName}.js`;
      const customVendorFileURL = `${baseUrl}/_hot-load/${normalizeAppName(
        appName
      )}.js?t=${Date.now()}&components=${encodeURIComponent(
        cancelableEvent.components.join(',')
      )}&file=${encodeURIComponent(path.split('\\').join('/'))}`;
      script.onerror = function () {
        hotReloadService.incrementProperty('scriptDownloadErrors');
        if (hotReloadService.scriptDownloadErrors > 3) {
          hotReloadService.toggleProperty('useOriginalVendorFile');
          hotReloadService.set('scriptDownloadErrors', 0);
        }
        if (hasLoadError) {
          window['error'](`
            Unable to load new assets for 'ember-ast-hot-load', looks like something blocking requests..
          `);
          return;
        }
        hasLoadError = true;
        script.src = originalVendorFileURL;
      };
      script.type = 'text/javascript';

      if (crossOrigin) {
        script.crossOrigin = crossOrigin;
      }

      if (hotReloadService.get('useOriginalVendorFile')) {
        script.src = originalVendorFileURL;
      } else {
        script.src = customVendorFileURL;
      }
      document.body.appendChild(script);

      return true;
    }
    return false;
  };
  Plugin.prototype.analyze = function () {
    return {
      disable: false,
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
    'dummy'
  );
}

function getConfig(appName) {
  let modulePath = `${appName}/config/environment`;
  if (require._eak_seen[modulePath]) {
    return require(modulePath).default;
  }
}

export function initialize(appInstance) {
  let hotLoadService = lookup(appInstance, 'service:hot-loader');
  if (!hotLoadService) {
    return;
  }
  if (hotLoadService.get('isFastBoot')) {
    return;
  }
  if (!window.LiveReload) {
    return;
  }
  let appName = getAppName(appInstance);
  if (appName === 'ember-ast-hot-load') {
    // TODO: find a better way to support other addons using the dummy app
    appName = 'dummy';
  }
  if (!appName) {
    appName = 'dummy';
  }
  const appConfig = getConfig(appName);
  const baseUrl =
    (appConfig['ember-ast-hot-load'] &&
      appConfig['ember-ast-hot-load'].baseUrl) ||
    '';
  const rootUrl = appConfig.rootURL || '/';
  const Plugin = createPlugin(appName, hotLoadService, rootUrl, baseUrl);
  window.LiveReload.addPlugin(Plugin);
}

export default {
  name: 'hot-loader-livereload-plugin',
  initialize,
};
