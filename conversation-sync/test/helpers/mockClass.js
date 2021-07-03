const { expect } = require('chai');

function logCall(document, name, ...args) {
	if (process.env.DEBUG_MOCKS) console.log('Mock Called: ', name, ...args)
	document.calls[name] = args;
}

class MockClass {
	constructor() {
		this.calls = {};
	}
	logCall(fn, ...args) {
		logCall(this, fn, ...args);
	}
	assertCall(fn, args) {
		expect(this.calls).to.haveOwnProperty(fn);
		expect(this.calls[fn]).to.containSubset(args);
	}
}

module.exports = MockClass;
