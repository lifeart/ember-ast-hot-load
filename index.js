"use strict";

const ADDON_NAME = "ember-ast-hot-load";

module.exports = {
  name: ADDON_NAME,
  serverMiddleware: function(config) {
    if (!this._OPTIONS.enabled) {
      return;
    }
    var lsReloader = require("./lib/hot-reloader")(
      config.options,
      this._OPTIONS.watch
    );
    lsReloader.run();
  },
  setupPreprocessorRegistry(type, registry) {
    let pluginObj = this._buildPlugin();
    pluginObj.parallelBabel = {
      requireFile: __filename,
      buildUsing: "_buildPlugin",
      params: {}
    };
    registry.add("htmlbars-ast-plugin", pluginObj);
  },

  _buildPlugin() {
    const _this = this;
    return {
      name: "ember-ast-hot-load-babel-plugin",
      plugin(env) {
        if (!_this._OPTIONS.enabled) {
          return function() {};
        }
        return require("./lib/ast-transform").call(this, env, _this._OPTIONS);
      },
      baseDir() {
        return __dirname;
      }
    };
  },
  _ensureFindHost() {
    if (!this._findHost) {
      this._findHost = function findHostShim() {
        let current = this;
        let app;
        do {
          app = current.app || app;
        } while (current.parent.parent && (current = current.parent));
        return app;
      };
    }
  },
  config(environment) {
    return {
      [ADDON_NAME]: {
        enabled: environment !== "production",
        watch: ["components"],
        helpers: []
      }
    };
  },
  _assignOptions(app) {
    let appOptions = app.options || {};
    let addonOptions = appOptions[ADDON_NAME] || {};
    let currentOptions = Object.assign(
      { enabled: true, helpers: [], watch: ["components"] },
      addonOptions
    );
    let { enabled, helpers, watch } = currentOptions;
    this._OPTIONS = {
      helpers,
      enabled,
      watch
    };
    this._isDisabled = !enabled;
  },

  included() {
    this._super.included.apply(this, arguments);
    let host = this._findHost();
    this._assignOptions(host);
  },

  isEnabled() {
    return !this._isDisabled;
  },
  treeForVendor(rawVendorTree) {
    if (this._isDisabled) {
      return;
    }

    let babelAddon = this.addons.find(
      addon => addon.name === "ember-cli-babel"
    );

    let transpiledVendorTree = babelAddon.transpileTree(rawVendorTree, {
      babel: this.options.babel,

      "ember-cli-babel": {
        compileModules: false
      }
    });

    return transpiledVendorTree;
  }
};
