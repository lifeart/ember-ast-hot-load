"use strict";
const HOT_LOAD_HELPER_NAME = "hot-load";

function createSubExpression(params, b) {
  return b.sexpr(b.path(HOT_LOAD_HELPER_NAME), params);
}

const helperNames = [
  "component",
  "link-to",
  HOT_LOAD_HELPER_NAME,
  "if",
  "each",
  "each-in",
  "unless",
  "in-element",
  "query-params",
  "-in-element",
  "concat",
  "get",
  "debugger",
  "else",
  "let",
  "hash",
  "input",
  "yield",
  "textarea",

  "t-for",
  "get-meta",
  "get-attr",
  "index-of",

  //ember-moment
  "moment-format",
  "moment-from-now",
  "moment-to",
  "moment-to-now",
  "moment-duration",
  "moment-calendar",
  "moment-diff",
  "is-before",
  "is-after",
  "is-same",
  "is-same-or-before",
  "is-same-or-after",
  "is-between",
  "now",
  "unix",

  //cp-validations
  "v-get",

  //route-action
  "route-action",

  // composable-helpers
  "map-by",
  "sort-by",
  "filter-by",
  "reject-by",
  "find-by",
  "object-at",
  "has-next",
  "has-previous",
  "group-by",
  "not-eq",
  "is-array",
  "is-empty",
  "is-equal",

  // liquid
  "liquid-unless",
  "liquid-container",
  "liquid-outlet",
  "liquid-versions",
  "liquid-bind",
  "liquid-spacer",
  "liquid-sync",
  "liquid-measured",
  "liquid-child",
  "liquid-if"
];

function looksLikeComponent(nodePath, appHelpers) {
  if (typeof nodePath.includes !== "function") {
    console.log(nodePath, typeof nodePath);
    return false;
  }
  return !appHelpers.includes(nodePath) && !helperNames.includes(nodePath) && nodePath.includes("-");
}

// For compatibility with pre- and post-glimmer
function unwrapNode(node) {
  if (node.sexpr) {
    return node.sexpr;
  } else {
    return node;
  }
}

function convertComponent(input, b, { helpers } = { helpers: []}) {
  const node = unwrapNode(input);
  if (node.__ignore) {
    return;
  }
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
  if (looksLikeComponent(nodePath, helpers)) {
    let componentName = node.path.original;
    node.path = b.path("component");
    node.params = [createSubExpression([b.string(componentName)], b)].concat(
      node.params
    );
  }
  return node;
}

function markNodeAsIgnored(node) {
  node.__ignore = true;
  return node;
}

module.exports = function(env, options) {
  let b = env.syntax.builders;
  return {
    name: "ember-ast-hot-load-transform",
    visitor: {
      ElementNode(node) {
        node.attributes.forEach(attr => {
          if (attr.value && attr.value.type === "MustacheStatement") {
            markNodeAsIgnored(attr.value);
          }
        });
      },
      ConcatStatement(node) {
        node.parts
          .filter(part => {
            return part.type === "MustacheStatement";
          })
          .forEach(item => {
            markNodeAsIgnored(item);
          });
      },
      SubExpression(node) {
        convertComponent(node, b, options);
      },
      BlockStatement(node) {
        convertComponent(node, b, options);
      },
      MustacheStatement(node) {
        if (node.path.original === "concat") {
          node.params.forEach(param => {
            markNodeAsIgnored(param);
          });
        }
        convertComponent(node, b, options);
      }
    }
  };
};
