'use strict';
/* eslint-env jest */
/* eslint-env node */
const middleware = require('./hot-load-middleware');
const path = require('path');

function assert(left, right) {
  expect(left).toEqual(right);
}


it('can ectract module name using getModuleName', () => {

  const exampleDeclaration = `
		define("web-app/components/abstract/table-provider/template", ["exports"], function (exports) {
		"use strict";
	  
		Object.defineProperty(exports, "__esModule", {
		  value: true
		});
		exports.default = 42;
	  });
	`
  assert(
    middleware.getModuleName(exampleDeclaration), 'define"web-app/components/abstract/table-provider/template"'
  );
});

it('can generate file from array using generateFileFromArray', () => {

  const defines = [
    'foo', 'bar', 'baz'
  ].map(i => {
    return {
      file: i
    };
  });

  assert(
    middleware.generateFileFromArray(defines), "'use strict';foobarbaz");
});

it('can lookup file in path using findEntypointFile', () => {

  assert( middleware.findEntypointFile('foo.js', __dirname ), false);
  assert( middleware.findEntypointFile('hot-load-middleware.js'), false);
  assert( middleware.findEntypointFile('hot-load-middleware.js', __dirname), 'hot-load-middleware.js');
  assert( middleware.findEntypointFile('hot-load', __dirname), 'hot-load-middleware.js');

  const nestedPath =  path.join(__dirname, '../', 'addon');
  assert( middleware.findEntypointFile('components/hot-content', nestedPath), ['components', 'hot-content.js'].join(path.sep));
});

it('can extract related defines using extractFileDataToResult', () => {

	const fileComponents = [
		'define("web-app/components/abstract/table-provider/template", ["exports"], function (exports) {});',
		'define("web-app/components/abstract/table-providers/template", ["exports"], function (exports) {});',
		'define("web-app/components/abstract/tables-providers/template", ["exports"], function (exports) {});'
	]
	const exampleDeclaration = `
		${fileComponents[0]}
		${fileComponents[1]}
	`;

	const expectedResult =  {
		originalFile: exampleDeclaration,
		result: {
			components: ["abstract/table-provider"],
			file: "name.js",
			items: [
				{
					file: fileComponents[0],
					name: '"web-app/components/abstract/table-provider/template"'
				}
			],
			splitter: "define("
		}
	};

	assert( middleware.extractFileDataToResult(exampleDeclaration, 'name.js', 'abstract/table-provider'), expectedResult);

});
