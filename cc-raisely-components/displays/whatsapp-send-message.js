/**
  * Displays pre-populated WhatsApp share options
  *
  * @field {text} message1
  * @field {text} message2
  * @field {text} message3
  * @field {text} message4
  */


// eslint-disable-next-line no-unused-expressions
(RaiselyComponents, React) => {
	/**
	 * This is the closure area of your custom component, allowing you to
	 * specify and declare code used by your main component. This allows for
	 * a greater amount of complexity in your components while ensuring your
	 * component performs correctly.
	 */

	/**
	 * The api can be accessed from the RaiselyComponents object, along with various
	 * internal Raisely Components
	 */
	const { Atoms } = RaiselyComponents;
	const { Button } = Atoms;

	const WhatsAppMessage = (props, context) => {
		const {
			message,
			link,
			buttonTheme,
		} = props;

		function textWithLink(text, l) {
			return `${text}\n${l}`;
		}

		function generateParagraphs(text, l) {
			return textWithLink(text, l)
				.split('\n')
				.map((line, index, arr) => (
					<>{line}{(index < arr.length - 1) ? (<br />) : ''}</>
				));
		}

		function generateWhatsAppLink(text, l) {
			const whatsAppText = encodeURIComponent(textWithLink(text, l));
			const url = `https://api.whatsapp.com/send?text=${whatsAppText}`;

			return url;
		}

		const paragraphs = generateParagraphs(message, link);
		const whatsAppUrl = generateWhatsAppLink(message, link);

		return (
			<div>
				<div className="whatsapp-bubble">
					<p>
						{paragraphs}
					</p>
				</div>
				<p className="whatsapp-button">
					<Button
						theme={buttonTheme}
						href={whatsAppUrl}>
						Send
					</Button>
				</p>
				<hr />
			</div>
		);
	};

	/**
	 * Once you've declared your required components, be sure to return the class
	 * representing your final Raisely Component so it can be shown on your page.
	 */
	return (props) => {
		const values = props.getValues();

		const {
			buttonTheme,
		} = values;

		const baseUrl = `${window.location.protocol}//${window.location.host}/`;
		let linkUrl = baseUrl;

		if (props.global.user && props.global.user.profile) {
			linkUrl += props.global.user.profile.path;
		}

		const messages = [];
		let count = 1;
		do {
			messages.push(values[`message${count}`]);
			count += 1;
		} while (values[`message${count}`]);

		// Include a blank message for the user
		messages.push('');

		return (
			<div className="whatsapp-chooser">
				{messages.map(message => (
					<WhatsAppMessage
						message={message}
						link={linkUrl}
						buttonTheme={buttonTheme}
					/>
				))}
			</div>
		);
	};
};
