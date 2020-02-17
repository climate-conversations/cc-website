const fs = require("fs");
const path = require('path');
const requireFromString = require('require-from-string');
const { expect } = require('chai');

function loadClass(filename) {
	const fullPath = path.join(__dirname, filename);
	const file = fs.readFileSync(fullPath, 'utf8');
	const prepend = 'module.exports = ';
	const mod = requireFromString(prepend + file, path);
	const DummyReact = class DummyReact {};
	return mod({}, DummyReact);
}

const testText = "<h2>Welcome</h2><p>This is <b>bold </b>and&nbsp;<i>italic</i>&nbsp;and <strike>strike</strike></p><ul><li>bullet 1</li><li>bullet 2</li></ul><p><br></p><hr><p><br></p><ol><li>list 1</li><li>list 2</li></ol><p><br></p><p><a href=\"https://climate.sg\" target=\"_blank\">Link with text</a></p><p><br></p><p>This link: <a href=\"http://climate.sg\" target=\"_blank\">climate.sg</a></p>"
const whatsAppText = `Welcome
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
});
