"use strict";
const HOT_LOAD_HELPER_NAME = "hot-load";

function createSubExpression(params, b) {
  return b.sexpr(b.path(HOT_LOAD_HELPER_NAME), params);
}

const helperNames = [
	"component", 
	"link-to",

	"t-for", 
	"get-meta", 
	"get-attr", 
	"index-of", 
	"moment-format", 
	"moment-from-now",

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
	"is-equal"
];

function looksLikeComponent(nodePath) {
	if (typeof nodePath.includes !== 'function') {
		console.log(nodePath, typeof nodePath);
		return false;
	}
  return (
		!helperNames.includes(nodePath) &&
    nodePath.includes("-") &&
    nodePath !== HOT_LOAD_HELPER_NAME
  );
}

// For compatibility with pre- and post-glimmer
function unwrapNode(node) {
  if (node.sexpr) {
    return node.sexpr;
  } else {
    return node;
  }
}

function convertComopnent(input, b) {
  const node = unwrapNode(input);
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
    name: "ember-ast-hot-load-transform",

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
