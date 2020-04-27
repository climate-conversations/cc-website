/**
 * This is a utility component to help with
 * * Upserting people records
 * * Making requests through the permissions proxy
 * * Requests to the facil setup cloud function
 *
 * Import this at the top of other components
 * @example
 * const UserSaveRef = RaiselyComponets.import('cc-user-save');
 * let UserSave;
 *
 * // Within code that calls it
 * if (!UserSave) UserSave = UserSaveRef().html;
 * UserSave.upsertUser({
 * 	email, preferredName
 * });
 */
(RaiselyComponents) => {
	const { getCurrentToken } = RaiselyComponents.api;
	const { qs } = RaiselyComponents.Common;

	const proxyUrl = 'https://asia-northeast1-climate-conversations-sg-2019.cloudfunctions.net/proxy';
	const upsertUrl = 'https://asia-northeast1-climate-conversations-sg-2019.cloudfunctions.net/upsertUser';
	const setupFacilUrl = 'https://asia-northeast1-climate-conversations-sg-2019.cloudfunctions.net/setupVolunteer';

	return class UserSaveHelper {
		static actionFields = ['host', 'facilitate', 'volunteer', 'hostCorporate', 'research', 'fundraise'];

		static async doFetch(url, options) {
			let json;
			// Message stores the best error message if an exception is
			// thrown along the way
			let message = 'Cannot reach server (are you offline?)';

			const opts = Object.assign({
				mode: 'cors',
				headers: {
					'Content-Type': 'application/json',
				},
			}, options);

			if (opts.query) {
				const queryStr = qs.stringify(opts.query);
				url = `${url}?${queryStr}`;
				delete opts.query;
			}

			try {
				// Send the users token for authorization
				const token = getCurrentToken();
				if (token) opts.headers.Authorization = `Bearer ${token.replace(/"/g, '')}`;

				console.log('Doing fetch', url, opts);
				if (opts.body && typeof opts.body !== 'string') {
					opts.body = JSON.stringify(opts.body);
				}
				const response = await fetch(url, opts);

				// If the request didn't succeed, log the error
				// and try to create a helpful error for the user
				if (response.status !== 200) {
					// Default to showing the response text
					message = `Error: ${response.statusText}`;

					// But try to get a better message if we can
					json = await response.json();
					console.error(json);
					// eslint-disable-next-line prefer-destructuring
					message = json.errors[0].message;

					throw new Error(message);
				}

				// If the request succeeded with no JSON, that's weird
				message = 'Sorry, something unusual went wrong';
				json = await response.json();
			} catch (error) {
				// If fetch has thrown an error the message is pretty cryptic
				// log the message for developers and give the end user a better message
				console.error(error);
				error.oldMessage = error.message;
				error.message = message;
				throw error;
			}

			return json.data;
		}

		/**
		 * Proxies a request through the permission escalation cloud function
		 * This passes on the users login token, which the proxy will use to check
		 * if the user is permitted to escalate their permissions
		 *
		 * @param {string} path Raisely api path
		 * @param {object} options To pass to fetch
		 * @return {object} the contents of the resulting JSON response
		 */
		static async proxy(path, options) {
			const url = `${proxyUrl}${path}`;
			return this.doFetch(url, options);
		}

		/**
		 * Make a call to the volunteer setup function
		 * @param {object} data Options to pass to the volunteer setup cloud function
		 */
		static async setupVolunteer(data) {
			return this.doFetch(setupFacilUrl, {
				method: 'post',
				body: { data },
			});
		}

		/**
		 * Helper to perform an upsert of a user
		 * @param {object} record
		 * @returns {object} A limited version of the user record
		 */
		static async upsertUser(record, options) {
			return this.doFetch(upsertUrl, {
				method: 'post',
				body: { data: record, ...options },
			});
		}
	};
};
