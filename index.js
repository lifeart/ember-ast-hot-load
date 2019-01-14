"use strict";
const path = require("path");
const fs = require("fs");
const map = require('broccoli-stew').map;
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
    if (!this.isEnabled()) {
      return;
    }
    // console.log('type', type);
    let pluginObj = this._buildPlugin(this._OPTIONS);
    pluginObj.parallelBabel = {
      requireFile: __filename,
      buildUsing: "_buildPlugin",
      params: { }
    };
    registry.add("htmlbars-ast-plugin", pluginObj);
  },

  _buildPlugin(opts) {
    console.log('_buildPlugin', opts);
    return {
      name: "ember-ast-hot-load-babel-plugin",
      plugin: require("./lib/ast-transform"),
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
    this._ENV = environment;
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
    let resolvedPath = null;
    let root = this.project.root;
    try {
      resolvedPath = path.relative(root, require.resolve(npmCompilerPath));
    } catch(e) {
      try {
        resolvedPath = path.relative(root, require.resolve(path.join(root, 'node_modules', npmCompilerPath)));
      } catch (ee) {
        try {
          resolvedPath = path.relative(root, require.resolve(path.join(root, '../node_modules', npmCompilerPath)));
        } catch (eee) {
          resolvedPath = path.relative(root, require.resolve(path.join(root, '../../node_modules', npmCompilerPath)));
        }
      }
    }
    return resolvedPath;
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
  importTransforms() {
    return {
      'fastboot-safe': {
        transform(tree) {
          return map(tree, (content)=>{
            return `
              ;if (typeof FastBoot === 'undefined') {
                ${content}
              };
            `;
          });
        },

        processOptions(assetPath, entry, options) {
          options[assetPath] = {};
          return options;
        },
      },
    };
  },
  included(app) {
    this._super.included.apply(this, arguments);
    let host = this._findHost();
    this._assignOptions(host);
    // Require template compiler as in CLI this is only used in build, we need it at runtime
    const npmPath =
      this._OPTIONS["templateCompilerPath"] || this._getTemplateCompilerPath();
    if (fs.existsSync(npmPath)) {
      app.import(npmPath,{
        using: [
          { transformation: 'fastboot-safe'}
        ]
      });
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
    if (this._ENV && this._ENV === 'production') {
      this._isDisabled = true;
    }
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
