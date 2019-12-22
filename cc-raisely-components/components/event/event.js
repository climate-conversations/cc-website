(RaiselyComponents, React) => {
	const { get } = RaiselyComponents.Common;

	// Fields to hide if a user is already logged in and has set a value for
	// those fields already
	const cachedUserFields = [
		'user.firstName', 'user.fullName', 'user.lastName', 'user.preferredName',
		'user.email', 'user.phoneNumber', 'user.mailingList',
	];
	// RSVP fields to show if none are selected
	const defaultFields = [
		'user.preferredName', 'user.email', 'user.phoneNumber',
		'event_rsvp.guests', 'user.mailingList',
		// Always last
		'user.privacyNotice', 'event_rsvp.photoNotice',
	];

	return class Event extends React.Component {
		/**
		 * Get the rsvpMethod selected for an event from public.rsvpMethod
		 * Fall back to inferring method for older events
		 * @return {string} the rsvpMethod
		 */
		static getRsvpMethod(eventRecord) {
			const method = get(eventRecord, 'public.signupMethod');
			if (method) return method;
			if (get(eventRecord, 'public.signupUrl')) return 'link';
			if (get(eventRecord, 'public.signupEmbed')) return 'embed';

			return 'raisely';
		}

		static getDefaultRsvpFields() {
			return defaultFields;
		}

		/**
		 * @param {object} eventRecord The event that's loaded
		 * (will pull rsvp fields from public.rsvpFields)
		 * @param {object} user Optional, Logged in user
		 * any userFields present in this model will be removed from the rsvp fields
		 * @return The rsvp fields to display for the event or defaultFields
		 */
		static getRsvpFields(eventRecord, user) {
			let rsvpFields = get(eventRecord, 'public.rsvpFields');
			if (rsvpFields) rsvpFields = rsvpFields.split(';');
			else rsvpFields = this.getDefaultRsvpFields();

			const selectedFields = rsvpFields.filter(field =>
				!cachedUserFields.includes(field) || !get({ user }, field));

			return selectedFields;
		}
	};
};
