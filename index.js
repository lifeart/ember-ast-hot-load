"use strict";
const path = require("path");
const fs = require("fs");

const ADDON_NAME = "ember-ast-hot-load";

module.exports = {
  name: ADDON_NAME,
  serverMiddleware: function(config) {
    if (!this._OPTIONS.enabled) {
      return;
    }

    config.app.get("/hot-load/:name", (req, res) => {
      var fs = require("fs");
      fs.readFile("dist/assets/" + req.params.name, "utf8", function(
        err,
        data
      ) {
        if (err) throw err;
		const definer = ";define";
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
        function cleanupString(a) {
          return a.replace(/[\r\n]+/g, " ");
        }
        const exports = data.split(definer).map(cleanupString);
        const components = req.query.components.split(",").filter(name => name);
        const result = {
          file: req.query.file,
          components: components,
          items: exports
            .map(item => {
              let name = item
                .split("[")[0]
                .replace("(", "")
                .replace(",", "")
                .split("'")
                .join("")
                .trim();

              return {
                file: definer + item.split("↵").join(" "),
                name: name
              };
            })
            .filter(item => {
              let hasComponent = false;
              components.forEach(componentName => {
                if (item.name.includes(componentName)) {
                  hasComponent = true;
                }
              });
              return hasComponent;
            }),
          splitter: definer
        };

        res.send(
          "'use strict';" + result.items.map(item => item.file).join("")
        );
      });
    });

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
    let currentOptions = Object.assign(
      {
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
