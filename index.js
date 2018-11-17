"use strict";
const path = require("path");
const fs = require("fs");

const ADDON_NAME = "ember-ast-hot-load";

module.exports = {
  name: ADDON_NAME,
  // attempt to fix unknown options bug
  _OPTIONS: {
    enabled: true,
    watch: ["components"],
    helpers: []
  },
  serverMiddleware: function (config) {
    if (!this._OPTIONS.enabled) {
      return;
    }
    require("./lib/hot-load-middleware")(
      config, 
      this._OPTIONS
    ).run();
    
    require("./lib/hot-reloader")(
      config.options,
      this._OPTIONS.watch
    ).run();
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
          return function () {};
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
  _getTemplateCompilerPath() {
    const npmCompilerPath = path.join(
      "ember-source",
      "dist",
      "ember-template-compiler.js"
    );
    return path.relative(this.project.root, require.resolve(npmCompilerPath));
  },
  _assignOptions(app) {
    let appOptions = app.options || {};
    let addonOptions = appOptions[ADDON_NAME] || {};
    let currentOptions = Object.assign({
        enabled: true,
        helpers: [],
        watch: ["components"],
        templateCompilerPath: undefined
      },
      addonOptions
    );
    let {
      enabled,
      helpers,
      watch,
      templateCompilerPath = undefined
    } = currentOptions;
    this._OPTIONS = {
      helpers,
      enabled,
      watch,
      templateCompilerPath
    };
    this._isDisabled = !enabled;
  },

  included(app) {
    this._super.included.apply(this, arguments);
    let host = this._findHost();
    this._assignOptions(host);
    // Require template compiler as in CLI this is only used in build, we need it at runtime
    const npmPath =
      this._OPTIONS["templateCompilerPath"] || this._getTemplateCompilerPath();
    if (fs.existsSync(npmPath)) {
      app.import(npmPath);
    } else {
      throw new Error(
        "Unable to locate ember-template-compiler.js. ember/ember-source not found in node_modules"
      );
    }
  },

  isEnabled() {
    return !this._isDisabled;
  },
  treeForVendor(rawVendorTree) {
    if (this._isDisabled) {
      return this._super.treeForVendor.apply(this, arguments);
    }
    if (!rawVendorTree) {
      return this._super.treeForVendor.apply(this, arguments);
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
