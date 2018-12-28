/* jshint node: true */
/* global require, module */
"use strict";
var fs = require("fs");

function getModuleName(item) {
  if (typeof item !== "string") {
    return "unable-to-get-module-name";
  }
  return item
    .split("[")[0]
    .replace("(", "")
    .replace(",", "")
    .split("'")
    .join("")
    .trim();
}

function onFileRequested(req, res) {
  var appFileName = req.params.name.split('---').join('/');
  if (!appFileName.endsWith('.js')) {
    return res.status(404).send('Not found');
  }
  const filePath = "dist/assets/" + appFileName;
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Not found');
  }
  fs.readFile(filePath, "utf8", function (
    err,
    data
  ) {
    if (err) throw err;
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");

    if (!req.query.components || !req.query.components.length) {
      res.send(data);
      return;
    }
    const definer = "define(";
    const exports = data.split(definer);
    const originalFile = exports.join(definer);
    const components = req.query.components.split(",").filter(name => name);
    const result = {
      file: req.query.file,
      components: components,
      items: exports
        .map(item => {
          return {
            file: definer + item,
            name: getModuleName(item)
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

    if (result.items.length) {
      res.send(
        "'use strict';" + result.items.map(item => item.file).join("")
      );
    } else {
      res.send(originalFile);
    }
    // const resultOutput = exports
  });
}


module.exports = function HotReloader(config/*, options = {}*/) {

  return {
    run: function () {
      config.app.get("/_hot-load/:name", onFileRequested);
    }
  };

};
