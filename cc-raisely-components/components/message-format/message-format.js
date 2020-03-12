
// Bold -> **
// Italitc -> __
// h -> ** + line break
// link -> text (url)
// p -> line break / line break
// br/ -> line break
// hr -> * * *

(RaiselyComponents, React) => {
	let stripHtml;
	const { get } = RaiselyComponents.Common;

	function loadJS(url, implementationCode) {
		//url is URL of external file, implementationCode is the code
		//to be called from the file, location is the location to
		//insert the <script> element

		var scriptTag = document.createElement('script');
		scriptTag.src = url;

		scriptTag.onload = implementationCode;
		scriptTag.onreadystatechange = implementationCode;

		document.body.appendChild(scriptTag);
	}

	const stripPromise = new Promise((resolve) => {
		function assignStripHtml() {
			stripHtml = window.stringStripHtml;
			resolve();
		}

		if (typeof window === 'undefined') {
			stripHtml = require('string-strip-html');
			resolve();
		} else {
			if (window.stringStripHtml) {
				assignStripHtml();
			} else {
				loadJS('https://cdn.jsdelivr.net/npm/string-strip-html@4.3.16/dist/string-strip-html.umd.js', assignStripHtml, document.body);
			}
		}
	});

	class MessageFormat {
		static anchor({ tag, deleteFrom, deleteTo }) {
			let insert = ' ';
			// console.log(MessageFormat.lastHrefOpened, deleteFrom, deleteTo, tag);
			// Opening Tag
			if (!tag.slashPresent) {
				const href = tag.attributes.find(attr => attr.name === 'href');
				if (href) MessageFormat.href = href;
				MessageFormat.lastHrefOpened = deleteTo;
			} else {
				// Closing tag
				const closeTagStarts = deleteFrom;
				const startClose = MessageFormat.html.indexOf('<', closeTagStarts);
				const child = MessageFormat.html.substring(closeTagStarts, startClose);
				const href = MessageFormat.href.value;
				let link = href;
				if (link.startsWith('http://')) link = link.substring(7, link.length);
				if (link.startsWith('https://')) link = link.substring(8, link.length);

				console.log(link, child);
				// Append (href) unless the link is actually just the href
				if (!child.includes(link)) insert = ` (${href}) `;
			}
			return insert;
		}

		static listWrapper({ tag }) {
			let insert = '\n';
			// Opening tag
			if (!tag.slashPresent) {
				MessageFormat.listStack.push(tag.name);
				MessageFormat[tag.name].index += 1;
				MessageFormat[tag.name].counters[MessageFormat[tag.name].index] = 1;
			} else {
				// Closing tag
				MessageFormat.listStack.pop();
				MessageFormat[tag.name].index -= 1;
			}
			return insert;
		}

		static listItem({ tag }) {
			const bullets = '•+-';
			const listType = MessageFormat.listStack[MessageFormat.listStack.length - 1];
			let insert = '';
			if (!tag.slashPresent) {
				const { index } = MessageFormat[listType];
				if (listType === 'ol') {
					insert = `${MessageFormat[listType].counters[index]}. `;
				} else {
					const bullet = bullets[index];
					insert = `${bullet} `;
				}
				MessageFormat[listType].counters[index] += 1;
			} else {
				insert = '\n';
			}
			return insert;
		}

		static async format(html, format) {
			// wait for library to load
			await stripPromise;

			MessageFormat.html = html;
			MessageFormat.listStack = [];
			MessageFormat.ol = {
				index: -1,
				counters: [],
			};
			MessageFormat.ul = {
				index: -1,
				counters: [],
			};

			function processTag(config) {
				const {
					tag,
					deleteFrom,
					deleteTo,
					insert,
					rangesArr,
					proposedReturn
				} = config;
				let replacement = insert;
				const tagFormat = MessageFormat.patterns[format].find(pattern => pattern.tag === tag.name);
				if (tagFormat) {
					if (tagFormat.fn) {
						replacement = tagFormat.fn(config);
					} else {
						replacement = (tag.slashPresent ? tagFormat.end : tagFormat.start) || '';
					}
				}

				rangesArr.push(
					deleteFrom,
					deleteTo,
					replacement
				);
			}

			return stripHtml(html, {
				dumpLinkHrefsNearby: {
				  enabled: true,
				  putOnNewLine: false,
				  wrapHeads: "(",
				  wrapTails: ")"
				},
				trimOnlySpaces: true,
				cb: processTag,
			});
		}

		static substitute(template, data) {
			const subPattern = /{{([A-Za-z._\s]*)}}/gm
			return template.replace(subPattern, (sub, group1) => get(data, group1.trim(), ''));
		}
	}

	MessageFormat.patterns = {
		whatsapp: [
			{ tag: 'strong', start: ' *', end: '* ' },
			{ tag: 'b', start: ' *', end: '* ' },
			{ tag: 'i', start: ' _', end: '_ ' },
			{ tag: 'em', start: ' _', end: '_ ' },
			{ tag: 'strike', start: ' ~', end: '~ ' },
			{ tag: 'p', start: '\n', end: '\n' },
			// BR tag stands alone, should always be \n to account for
			// malformed html that uses <br> instead of <br/>
			{ tag: 'br', start: '\n', end: '\n' },
			{ tag: 'hr', start: '---' },
			{ tag: 'ul', fn: MessageFormat.listWrapper },
			{ tag: 'ol', fn: MessageFormat.listWrapper },
			{ tag: 'li', fn: MessageFormat.listItem },
			{ tag: 'a', fn: MessageFormat.anchor },
		],
		email: [
			{ tag: 'p', start: '\n', end: '\n' },
			// BR tag stands alone, should always be \n to account for
			// malformed html that uses <br> instead of <br/>
			{ tag: 'br', start: '\n', end: '\n' },
			{ tag: 'hr', start: '===' },
			{ tag: 'ul', fn: MessageFormat.listWrapper },
			{ tag: 'ol', fn: MessageFormat.listWrapper },
			{ tag: 'li', fn: MessageFormat.listItem },
			{ tag: 'a', fn: MessageFormat.anchor },
		],
	}

	return MessageFormat;
};
