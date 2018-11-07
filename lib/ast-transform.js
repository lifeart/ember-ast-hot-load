"use strict";
const HOT_LOAD_HELPER_NAME = "hot-load";

function createSubExpression(params, b) {
  return b.sexpr(b.path(HOT_LOAD_HELPER_NAME), params);
}

function looksLikeComponent(nodePath) {
  return (
    nodePath !== "component" &&
    nodePath.includes("-") &&
    nodePath !== HOT_LOAD_HELPER_NAME
  );
}

function convertComopnent(node, b) {
  const nodePath = node.path.original;
  if (nodePath === "component") {
    let firstParam = node.params[0];
    if (firstParam.value === HOT_LOAD_HELPER_NAME) {
      return;
    }
    if (firstParam.path) {
      if (firstParam.path.original === HOT_LOAD_HELPER_NAME) {
        return;
      }
    }
    node.params = [createSubExpression([firstParam], b)].concat(
      node.params.filter(n => n !== firstParam)
    );
  }
  if (looksLikeComponent(nodePath)) {
    let componentName = node.path.original;
    node.path = b.path("component");
    node.params = [createSubExpression([b.string(componentName)], b)].concat(
      node.params
    );
  }
  return node;
}

module.exports = function(env) {
  let b = env.syntax.builders;
  return {
    name: "ast-transform",

    visitor: {
      BlockStatement(node) {
        convertComopnent(node, b);
      },
      MustacheStatement(node) {
        convertComopnent(node, b);
      }
    }
  };
};
