(RaiselyComponents) => {
	const { getCurrentToken } = RaiselyComponents.api;

	const proxyUrl = 'https://asia-northeast1-climate-conversations-sg-2019.cloudfunctions.net/proxy';
	const upsertUrl = 'https://asia-northeast1-climate-conversations-sg-2019.cloudfunctions.net/upsertUser';

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

		static async proxy(path, options) {
			const url = `${proxyUrl}${path}`;
			return this.doFetch(url, options);
		}

		/**
		 * Helper to perform an upsert of a user
		 * @param {object} record
		 */
		static async upsertUser(record) {
			return this.doFetch(upsertUrl, {
				method: 'post',
				body: { data: record },
			});
		}
	};
};
