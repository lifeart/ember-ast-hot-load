/* global module */
// builders ref https://github.com/glimmerjs/glimmer-vm/blob/master/packages/%40glimmer/syntax/lib/builders.ts
const HOT_LOAD_HELPER_NAME = "hot-load";
// for cases like {{#let (component 'foo-bar') as |Boo|}}  <Boo />a {{/let}}
var nestedNames = [];

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
    nodePath.includes("-") && !nodePath.includes('.')
  );
}

const helperNames = [
  "identity", // glimmer blocks
  "render-inverse", // glimmer blocks
  "-get-dynamic-var", // glimmer internal helper
  "-lf-get-outlet-state", // dunno
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
    b.pair("hotReloadCUSTOMHasHash", b.boolean(hotReloadCustomHasHash))
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
    node.params = [createSubExpression([firstParam, b.path('this'), b.path(componentName), b.string(componentName.original || componentName) ], b)].concat(
      node.params.filter(n => n !== firstParam)
    );
  } else if (looksLikeComponent(nodePath, helpers)) {
    let componentName = node.path.original;
    node.path = b.path("component");
    buildNodeHashAndStats(node, componentName, b);
    node.params = [createSubExpression([b.string(componentName), b.path('this'), b.path(componentName), b.string(componentName.original || componentName)], b)].concat(
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

function captureBlockParams(node) {
	const params = node.blockParams;
    if (node.__ignore) {
       return;
    }
    params.forEach((param)=>{
       if (!nestedNames.includes(param)) {
         nestedNames.push(param);
       }
     });
}

function extractAngleBrackedComponentName(name) {
  return name.split('::').join('/');
}
function safeAngleBrackedTagName(name) {
  return name.split('::').join('___');
}

function wrapAngeBrackedComponentWithLetHelper(b, node, options = {}) {
  const tagName = node.tag;
  const newNode = JSON.parse(JSON.stringify(node));
  captureBlockParams(node);
  newNode.cloned = true;
  node.type = "BlockStatement";
  node.params = [
    b.sexpr(b.path('component'), [b.string(extractAngleBrackedComponentName(tagName))])
  ];
  node.path = b.path('let');
  node.hash = b.hash([]);
  const salt = (options && options.salt) || Math.random().toString(36).slice(2);
  newNode.tag = 'HotLoad' + safeAngleBrackedTagName(tagName) + salt;
  node.program = b.program([newNode], [newNode.tag]);
  node.program['__ignore'] = true;
  node.inverse = null; 
  node.loc = null;
}

function isAngleBrackedComponent(node) {
  const tagName = node.tag;
  if (tagName.charAt(0) === tagName.charAt(0).toUpperCase()) {
    if (node.cloned) {
      return false;
    }
    if (nestedNames.includes(tagName)) {
      return false;
    }
    if (tagName === 'Input' || tagName === 'Textarea') {
      return false;
    }
    // https://github.com/emberjs/ember.js/pull/17146
    // https://github.com/emberjs/ember.js/pull/17160
    // https://github.com/glimmerjs/glimmer-vm/pull/892
    // dunno how to detect in transformation time
    if (node.attributes && node.attributes.length) {
      // looks like ember can't handle ...attributes inside `let'ed` component.
      let attrs = node.attributes.filter((attr)=>attr.name === '...attributes');
      if (attrs.length) {
        return false;
      }
    }
    if (tagName.indexOf('.') !== -1) {
      return false;
    }
    if (tagName.charAt(0) === '@') {
      return false;
    }
    return true;
  }
  return false;
}

class BaseASTHotLoadTransform {
  constructor() {
    this.syntax = null;
  }
  static createASTPlugin(config, syntax) {
    let b = syntax.builders;
    let options = config || { helpers: [] };
    // console.log('config', config.addonContext._OPTIONS);
    nestedNames = [];

    const visitor = {
      ElementModifierStatement(node) {
        markNodeAsIgnored(node.path);
        node.params.forEach(param => {
          markNodeAsIgnored(param);
        });
      },
      Program(node) {
        captureBlockParams(node);
      },
      ElementNode(node) {
        node.attributes.forEach(attr => {
          if (attr.value && attr.value.type === "MustacheStatement") {
            markNodeAsIgnored(attr.value);
          }
        });
        if (isAngleBrackedComponent(node)) {
          wrapAngeBrackedComponentWithLetHelper(b, node, options);
        }
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
    };
    
    return {
      name: 'ember-ast-hot-load',
      visitor
    }
  }
}

// module.exports = ASTHotLoadTransform;

module.exports = function(config) {
  return class ASTHotLoadTransform extends BaseASTHotLoadTransform {

    transform(ast) {
      // let startLoc = ast.loc ? ast.loc.start : {};
      // /*
      //   Checking for line and column to avoid registering the plugin for ProgramNode inside a BlockStatement since transform is called for all ProgramNodes in Ember 2.15.X. Removing this would result in minifying all the TextNodes.
      // */
      // if (startLoc.line !== 1 || startLoc.column !== 0) {
      //   return ast;
      // }
      const astConfig = config.addonContext._OPTIONS || {};
      if (!astConfig.enabled) {
        return ast;
      }

      // cover case for blacklisted addon
      if (!astConfig.initialized) {
        return ast;
      }

      let plugin = ASTHotLoadTransform.createASTPlugin(astConfig, this.syntax);
      this.syntax.traverse(ast, plugin.visitor);
      return ast;
    }
  };
};