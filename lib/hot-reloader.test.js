'use strict';
/* eslint-disable ember/no-invalid-debug-function-arguments */
/* eslint-env jest */
/* eslint-env node */

const HotReloader = require('./hot-reloader');

async function testHotReloadChangedUrl(options, expectedUrl) {
	jest.mock('http');
	jest.mock('https');
	const http = require('http');
	const https = require('https');
	let fileDidChangeHandler = null;
	const defaultOptions = {
		liveReload: true,
		ui: { writeLine() { } },
		project: { liveReloadFilterPatterns: [] },
		watcher: {
			on(eventName, callback) {
				if (eventName === "change") {
					fileDidChangeHandler = callback;
				}
			}
		}
	};

	let reloader = HotReloader(Object.assign(defaultOptions, options));
	reloader.run();
	await fileDidChangeHandler({ filePath: '/components/path/to/my-component.js'});

	const {
		hostname: expectedHostname,
		pathname,
		search,
		port: expectedPort,
		protocol: expectedProtocol
	} = new URL(expectedUrl);
	const expectedPath = `${pathname}${search}`;
	let transport = expectedProtocol === 'https:' ? https : http;
	expect(transport.get).toHaveBeenLastCalledWith({
		hostname: expectedHostname,
		path: expectedPath,
		port: expectedPort,
		rejectUnauthorized: false
	}, expect.anything());
}

it('requests the correct change URL for the default live reload options', async () => {
	await testHotReloadChangedUrl({}, 'http://localhost/changed?files=/components/path/to/my-component.js');
});

it('requests the correct change URL when the live reload prefix is /', async () => {
	const options = {
		liveReloadHost: 'my-host.test',
		liveReloadPort: 36629,
		liveReloadPrefix: '/'
	};
	await testHotReloadChangedUrl(options, 'http://my-host.test:36629/changed?files=/components/path/to/my-component.js');
});

it('requests the correct change URL when the live reload prefix ends with a /', async () => {
	const options = {
		liveReloadHost: 'my-host.test',
		liveReloadPort: 1234,
		liveReloadPrefix: '/this/is/my/path/'
	};
	await testHotReloadChangedUrl(options, 'http://my-host.test:1234/this/is/my/path/changed?files=/components/path/to/my-component.js');
});

it('requests the correct change URL when the live reload server uses SSL', async () => {
	const options = {
		liveReloadHost: 'my-host.test',
		liveReloadPort: 1234,
		liveReloadPrefix: '',
		ssl: true
	};
	await testHotReloadChangedUrl(options, 'https://my-host.test:1234/changed?files=/components/path/to/my-component.js');
});
