/**
  * @param {text} text The text prompt to display
  * @param {text} buttonLink The link for the button
  * @param {text} buttonLabel The label for the button
  * @param {text} alwaysShow Set to 'yes' if you want it to always appear
  */
// eslint-disable-next-line no-unused-expressions
(RaiselyComponents, React) => {
	const defaults = {
		text: '{firstName}, would you like to do the thing?',
		buttonLink: '/do_thing',
		buttonLabel: 'Do it!',
	};

	// We can access specific Raisely components through the
	// RaiselyComponents prop
	const { Button } = RaiselyComponents.Atoms;

	/**
	  * Define when the action bar should appear
	  * @param {Profile} profile the profile of the currently logged in user
	  * undefined if user is not logged in or has no profile
	  * @returns {boolean} true if the action bar should appear
	  */
	function canShow({ profile }) {
		if (profile && profile.public && profile.public.switchStartedAt) {
			const switchStart = new Date(profile.public.switchStartedAt);
			const now = new Date();
			// Display if the switch started 5 minutes ago
			const interval = 5 * 60 * 1000;

			return ((now - switchStart) > interval);
		}
		return false;
	}

	/**
	  * Insert variables into text
	  */
	function renderText(text, values) {
		if (!text) return text;

		// For each impact, create a regexp to do a global replace
		// for {key} in the text, and replace it in the text
		const finalText = Object.keys(values).reduce((line, key) => {
			const re = new RegExp(`\\{${key}\\}`, 'g');
			return line.replace(re, values[key]);
		}, text);

		return finalText;
	}

	return (props) => {
		/**
		 * If you declare fields within your Custom Component settings, they can be accessed
		 * by calling props.getValues() if set within your page editor. If values aren't set
		 * while editing, they will not be present on the values object.
		 */
		const values = Object.assign({}, defaults, props.getValues());

		/**
		 * Raisely gives you access to global values that are based on the current state of the page.
		 * The campaign object represents the campaign object returned by Raisely, while user represents
		 * the currently logged in user (if your campaign allows user's to login).
		 */
		const {
			user,
			campaign,
		} = props.global;

		let enabled = false;
		let profile;

		// Check if the user is present and if we can show the user
		if (user) {
			({ profile } = user);
		}
		enabled = (values.alwaysShow === 'yes') || canShow({ campaign, user, profile });

		if (!enabled) {
			return '';
		}

		const attributes = {
			firstName: user.firstName,
		};
		['text', 'buttonLabel', 'butonLink'].forEach((key) => {
			values[key] = renderText(values[key], attributes);
		});

		return (
			<div className="action-bar">
				<p>
					{values.text}
					<Button
						href={values.buttonLink}
					>
						{values.buttonLabel}
					</Button>
				</p>
			</div>
		);
	};
};
