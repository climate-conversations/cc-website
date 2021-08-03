(RaiselyComponents, React) => {
	const { dayjs, get } = RaiselyComponents.Common;

	const sgOffset = 480;

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

	/**
	 * Calculate the offset between local time and sg time
	 * Used by other functions to be able to convert
	 * dates entered locally into SG time
	 * @returns {integer} Offset in minutes from local timezone to singapore time
	 */
	function offsetLocalToSg(date) {
		const localOffset = new Date(date).getTimezoneOffset();
		const diff = localOffset + sgOffset;
		return diff;
	}

	/**
	 * Convert a date and time string to a dayjs in local time
	 * interpreting the time as Singapore time
	 * @param {string} date The date to save as
	 * @return {dayjs}
	 */
	function singaporeTimezone(date) {
		const diff = offsetLocalToSg(date);
		return dayjs(date).subtract(diff, "minute");
	}

	/**
	 * Convert an ISO8601 date to Singapore time
	 * @param {string} date
	 */
	function fromUTC(date) {
		const diff = offsetLocalToSg(date);
		return dayjs(date).add(diff, "minute");
	}

	/**
	 * Split date into date and time strings in Singapore time
	 * @param {string} date A date in ISO8601
	 * @returns {object} { date: 'YYYY-MM-DD', time: 'HH:mm' }
	 */
	function timeFromDate(date) {
		const adjustedTime = fromUTC(date, true);
		return {
			time: adjustedTime.format("HH:mm"),
			date: adjustedTime.format("YYYY-MM-DD")
		};
	}

	/**
	 * Takes a date and time and converts them to an ISO8601 date
	 * The time is interpreted as Signapore time
	 * @param {string} date
	 * @param {string} time time in 24hr format
	 * @returns {string} ISO8601 string
	 */
	function dataAndTime(date, time) {
		const justDate = dayjs(date).format("YYYY-MM-DD");
		const fullTime = dayjs(`${justDate}T${time}`);
		if (!fullTime.isValid()) {
			throw new Error(
				`Cannot understand ${time}. Please specify the time in 24hr format (eg 21:30)`
			);
		}
		const adjustedTime = singaporeTimezone(fullTime);
		// Make the time in Singapore time
		return adjustedTime.toISOString();
	}

	return class Event {
		/**
		 * Convert an ISO8601 date to a dayjs that when .format is done the date/time
		 * will be in Singapore time
		 * @param {string} date
		 * @returns {dayjs} Dayjs date where .format('HH:mm') will be in Singapore time
		 */
		static inSingaporeTime(date) {
			return fromUTC(dayjs(date));
		}
		/**
		 * Returns an object containing formatted date and time in local time
		 * @param {string} date ISO8601 date
		 * @returns {object} { date: 'YYYY-MM-DD', time: 'HH:mm' }
		 */
		static singaporeTimeAndDate(date) {
			return timeFromDate(date);
		}
		/**
		 * Take a date string and time string and convert to an ISO8601
		 * Time is converted from SGT to UTC
		 * @param {string} date
		 * @param {string} time
		 * @returns {string} ISO8601 time
		 */
		static singaporeToISO(date, time) {
			return dataAndTime(date, time);
		}

		/**
		 * Convert event times from form to ISO8601 on event.startAt/endAt
		 * In the process it converts the time from Singapore time zone
		 *
		 * Takes startTime as a 24 hr time adds to startDate and saves it as ISO8601
		 * interpreting the time as Singapore time
		 *
		 * @param {Event} event
		 */
		static setTime(event) {
			/* eslint-disable no-param-reassign */
			event.timezone = "Singapore/Singapore";

			if (event.startAt) event.startAt = dataAndTime(event.startAt, event.startTime);
			if (event.endAt) event.endAt = dataAndTime(event.endAt, event.endTime);
			if (event.publicConversationAt) {
				event.publicConversationAt = dataAndTime(
					event.publicConversationAt,
					"12:00"
				);
			}
		}

		/**
		 * Convert event startAt and endAt fields for use in
		 * form to edit, separating date and time into event.startAt and event.startTime
		 *
		 * Extract the time from event.startAt and event.endAt
		 * and convert date and time to Singapore time (from UTC)
		 * Mutates the event, adding startTime and endTime attributes
		 * and sets startAt to YYYY-MM-DD in Singapore time
		 * @note Running this over the event multiple times over the event will corrupt the date
		 * @param {*} event
		 */
		static getTime(event) {
			if (event.startAt) {
				const startDate = timeFromDate(event.startAt);
				event.startAt = startDate.date;
				event.startTime = startDate.time;
			}
			if (event.endAt) {
				const endDate = timeFromDate(event.endAt);
				event.endAt = endDate.date;
				event.endTime = endDate.time;
			}
			if (event.publicConversationAt) {
				const conversationDate = timeFromDate(event.startAt);
				event.publicConversationAt = conversationDate.date;
			}
		}

		/**
		 * Format the startAt date for an event (stored in UTC) in Singapore time
		 * for display
		 *
		 * @param {*} event The event/conversation
		 * @param {*} format Format string
		 * @returns formatted Singapore date & time (empty string if startAt is null)
		 */
		static displayDate(event, format = "D MMM YYYY") {
			const startAt = (event || {}).startAt;
			if (!startAt) return "";
			return this.inSingaporeTime(dayjs(startAt)).format(format);
		}

		/**
		 * Get the rsvpMethod selected for an event from public.rsvpMethod
		 * Fall back to inferring method for older events
		 * @return {string} the rsvpMethod
		 */
		static getRsvpMethod(eventRecord) {
			const method = get(eventRecord, "public.signupMethod");
			if (method) return method;
			if (get(eventRecord, "public.signupUrl")) return "link";
			if (get(eventRecord, "public.signupEmbed")) return "embed";

			return "raisely";
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
			let rsvpFields = get(eventRecord, "public.rsvpFields");
			if (rsvpFields) rsvpFields = rsvpFields.split(";");
			else rsvpFields = this.getDefaultRsvpFields();

			const selectedFields = rsvpFields.filter(
				field =>
					!cachedUserFields.includes(field) ||
					!get({ user }, field)
			);

			return selectedFields;
		}
	};
};
