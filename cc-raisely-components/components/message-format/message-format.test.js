const fs = require("fs");
const path = require('path');
const requireFromString = require('require-from-string');
const { expect } = require('chai');
const get = require('lodash/get');

const DummyRaiselyComponents = {
	Common: { get },
}

function loadClass(filename) {
	const fullPath = path.join(__dirname, filename);
	const file = fs.readFileSync(fullPath, 'utf8');
	const prepend = 'module.exports = ';
	const mod = requireFromString(prepend + file, path);
	const DummyReact = class DummyReact {};
	return mod(DummyRaiselyComponents, DummyReact);
}

const testText = "<h2>Welcome</h2><div><br></div>First para<div><br></div>Second para<p>This is <b>bold </b>and&nbsp;<i>italic</i>&nbsp;and <strike>strike</strike></p><ul><li>bullet 1</li><li>bullet 2</li></ul><div><br></div><hr><p><br></p><ol><li>list 1</li><li>list 2</li></ol><p><br></p><p><a href=\"https://climate.sg\" target=\"_blank\">Link with text</a></p><p><br></p><p>This link: <a href=\"http://climate.sg\" target=\"_blank\">climate.sg</a></p>"
const whatsAppText = `Welcome
First para
Second para
This is *bold* and _italic_ and ~strike~

• bullet 1
• bullet 2

---

1. list 1
2. list 2

Link with text (https://climate.sg)

This link: climate.sg
`;

const emailText = `Welcome
First para
Second para
This is bold and italic and strike

• bullet 1
• bullet 2

===

1. list 1
2. list 2

Link with text (https://climate.sg)

This link: climate.sg
`;

describe('Message Formatter', () => {
	let Format;
	let formattedText;
	before(() => {
		Format = loadClass('./message-format.js');
	});
	describe('WhatsApp', () => {
		it('formats correctly', async () => {
			formattedText = await Format.format(testText, 'whatsapp');
			expect(formattedText).to.eq(whatsAppText);
		});
	});
	describe('Email', () => {
		it('formats correctly', async () => {
			formattedText = await Format.format(testText, 'email');
			expect(formattedText).to.eq(emailText);
		});
	});
	describe('handlebars', () => {
		it('substitutes correcly', () => {
			const data = {
				facilitator: { preferredName: 'Josh' },
				event: { name: 'Your Event'},
			}
			const template = "Hello {{facilitator.preferredName}} thank you for processing {{ event.name}}. Here's the {{missing}} attribute";
			const expected = "Hello Josh thank you for processing Your Event. Here's the  attribute";
			const result = Format.substitute(template, data);
			expect(result).to.eq(expected);
		});
	});
});
