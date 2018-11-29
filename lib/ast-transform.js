/* global module */
// builders ref https://github.com/glimmerjs/glimmer-vm/blob/master/packages/%40glimmer/syntax/lib/builders.ts
const HOT_LOAD_HELPER_NAME = "hot-load";

function createSubExpression(params, b) {
  return b.sexpr(b.path(HOT_LOAD_HELPER_NAME), params);
}

function looksLikeComponent(nodePath, appHelpers) {
  if (typeof nodePath.includes !== "function") {
    // eslint-disable-next-line no-console
    console.log(nodePath, typeof nodePath);
    return false;
  }
  // const isCapitalized = nodePath.charAt(0) === nodePath.charAt(0).toUpperCase();
  // (isCapitalized || nodePath.includes("-"))
  return (
    !appHelpers.includes(nodePath) &&
    !helperNames.includes(nodePath) &&
    nodePath.includes("-")
  );
}

const helperNames = [
  "identity", // glimmer blocks
  "render-inverse", // glimmer blocks
  "-get-dynamic-var", // glimmer internal helper
  "action",
  "component",
  "link-to",
  HOT_LOAD_HELPER_NAME,
  "hot-content",
  "hot-placeholder",
  "if",
  "if-unless",
  "each",
  "each-in",
  "format-date",
  "format-message",
  "format-relative",
  "format-time",
  "unless",
  "in-element",
  "query-params",
  "-in-element",
  "-class",
  "-html-safe",
  "-input-type",
  "-normalize-class",
  "concat",
  "get",
  "mut",
  "readonly",
  "unbound",
  "debugger",
  "else",
  "let",
  "log",
  "loc",
  "hash",
  "input",
  "partial",
  "yield",
  "textarea",
  "t",
  "t-for",
  "transition-to",
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

  "outlet",

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
  "hasBlock",
  "has-block",
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
  "liquid-if",

  //app-version
  "app-version"
];

// For compatibility with pre- and post-glimmer
function unwrapNode(node) {
  if (node.sexpr) {
    return node.sexpr;
  } else {
    return node;
  }
}

function buildNodeHashAndStats(node, componentName,  b) {
  let hotReloadCUSTOMHasParams = node.params && node.params.length !== 0;
  let hotReloadCustomHasHash = node.hash && (node.hash.pairs || []).length !== 0;
  let hashPairs = [
    b.pair("hotReloadCUSTOMhlContext", b.path('this')),
    b.pair("hotReloadCUSTOMName", b.string(componentName.original || componentName)),
    b.pair("hotReloadCUSTOMhlProperty", b.path(componentName)),
    b.pair("hotReloadCUSTOMHasParams", b.boolean(hotReloadCUSTOMHasParams)),
    b.pair("hotReloadCustomHasHash", b.boolean(hotReloadCustomHasHash))
  ];
  if (node.hash && node.hash.pairs && node.hash.pairs.length) {
    node.hash = b.hash(hashPairs.concat(node.hash.pairs));
  } else {
    node.hash = b.hash(hashPairs);
  }
}

function convertComponent(input, b, {
  helpers
} = {
  helpers: []
}) {
  const node = unwrapNode(input);
  if (typeof node !== "object") {
    return;
  }
  if (node.__ignore && (node.path && node.path.original !== "component")) {
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
   
    let componentName = firstParam || firstParam.path.original;
    buildNodeHashAndStats(node, componentName, b);
    node.params = [createSubExpression([firstParam, b.path('this'), b.path(componentName)], b)].concat(
      node.params.filter(n => n !== firstParam)
    );
  } else if (looksLikeComponent(nodePath, helpers)) {
    let componentName = node.path.original;
    node.path = b.path("component");
    buildNodeHashAndStats(node, componentName, b);
    node.params = [createSubExpression([b.string(componentName), b.path('this'), b.path(componentName)], b)].concat(
      node.params
    );
   
  }
  return node;
}

function markNodeAsIgnored(node) {
  if (!node) {
    return;
  }
  if (typeof node !== "object") {
    return;
  }
  node.__ignore = true;
  if (node.value) {
    markNodeAsIgnored(node.value);
  }
  if (node.path) {
    markNodeAsIgnored(node.path);
  }
  if (node.params) {
    node.params.forEach(markNodeAsIgnored);
  }
  if (node.hash) {
    node.hash.pairs.forEach(markNodeAsIgnored);
  }
  return node;
}

module.exports = function (env, options) {
  let b = env.syntax.builders;
  return {
    name: "ember-ast-hot-load-transform",
    visitor: {
      ElementModifierStatement(node) {
        markNodeAsIgnored(node.path);
        node.params.forEach(param => {
          markNodeAsIgnored(param);
        });
      },
      ElementNode(node) {
        node.attributes.forEach(attr => {
          if (attr.value && attr.value.type === "MustacheStatement") {
            markNodeAsIgnored(attr.value);
          }
        });
      },
      HashPair(node) {
        if (
          node.value &&
          node.value.path &&
          node.value.path.original !== "component"
        ) {
          markNodeAsIgnored(node.value);
        }
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
        if (node.path.original === "component") {
          convertComponent(node, b, options);
        }
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
