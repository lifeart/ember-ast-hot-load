"use strict";
const HOT_LOAD_HELPER_NAME = "hot-load";

function createSubExpression(params, b) {
	return b.sexpr(b.path(HOT_LOAD_HELPER_NAME), params);
}

const helperNames = [
	HOT_LOAD_HELPER_NAME,
  "-class",
  "-html-safe",
  "-in-element",
  "-input-type",
  "-merge-refs",
  "-normalize-class",
  "action",
  "and",
  "app-version",
  "append",
  "array",
  "cancel-all",
  "chunk",
  "compact",
  "component",
  "compute",
  "concat",
  "contains",
  "debugger",
  "dec",
  "drop",
  "each",
  "each-in",
  "else",
  "eq",
  "equal",
  "filter",
  "filter-by",
  "find-by",
  "flatten",
  "get",
  "get-attr",
  "get-meta",
  "group-by",
  "gt",
  "gte",
  "has-next",
  "has-previous",
  "hash",
  "if",
  "if-unless",
  "in-element",
  "inc",
  "index-of",
  "input",
  "intersect",
  "invoke",
  "is-after",
  "is-array",
  "is-before",
  "is-between",
  "is-empty",
  "is-equal",
  "is-same",
  "is-same-or-after",
  "is-same-or-before",
  "join",
  "let",
  "lf-lock-model",
  "lf-or",
  "link-to",
  "liquid-bind",
  "liquid-child",
  "liquid-container",
  "liquid-if",
  "liquid-measured",
  "liquid-outlet",
  "liquid-spacer",
  "liquid-sync",
  "liquid-unless",
  "liquid-versions",
  "loc",
  "log",
  "lt",
  "lte",
  "map",
  "map-by",
  "map-value",
  "moment",
  "moment-add",
  "moment-calendar",
  "moment-diff",
  "moment-duration",
  "moment-format",
  "moment-from",
  "moment-from-now",
  "moment-subtract",
  "moment-to",
  "moment-to-date",
  "moment-to-now",
  "moment-unix",
  "mut",
  "next",
  "not",
  "not-eq",
  "not-equal",
  "now",
  "object-at",
  "optional",
  "or",
  "perform",
  "pipe",
  "pipe-action",
  "pluralize",
  "previous",
  "query-params",
  "queue",
  "range",
  "readonly",
  "reduce",
  "reject-by",
  "repeat",
  "reverse",
  "route-action",
  "safe",
  "shuffle",
  "singularize",
  "slice",
  "sort-by",
  "t-for",
  "take",
  "task",
  "textarea",
  "toggle",
  "toggle-action",
  "unbound",
  "union",
  "unix",
  "unless",
  "utc",
  "v-get",
  "without",
  "xor",
  "yield"
];


function isPrivateHelperOrComponent(name) {
	return name.startsWith('-');
}

function shouldExcludeComponent(name, exludedComponents) {
	return exludedComponents.includes(name);
}

function looksLikeComponent(nodePath, appHelpers, exludedComponents = []) {
	if (typeof nodePath.includes !== "function") {
		console.log(nodePath, typeof nodePath);
		return false;
	}
	if (isPrivateHelperOrComponent(nodePath)) {
		return false;
	}
	if (shouldExcludeComponent(nodePath, exludedComponents)) {
		return false;
	}
	return !appHelpers.includes(nodePath) && !helperNames.includes(nodePath);
}

// For compatibility with pre- and post-glimmer
function unwrapNode(node) {
	if (node.sexpr) {
		return node.sexpr;
	} else {
		return node;
	}
}

function convertComponent(input, b, {
	helpers,
	excluded
} = {
	helpers: [],
	excluded: []
}) {
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
	if (looksLikeComponent(nodePath, helpers, excluded)) {
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

module.exports = function (env, options) {
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
