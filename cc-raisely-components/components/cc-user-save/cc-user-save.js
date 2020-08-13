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

	const proxyHost = 'https://asia-northeast1-climate-conversations-sg-2019.cloudfunctions.net';
	const WEBHOOK_URL = `https://asia-northeast1-climate-conversations-sync.cloudfunctions.net/raiselyPeople`;

	const proxyUrl = `${proxyHost}/proxy`;
	const upsertUrl = `${proxyHost}/upsertUser`;
	const setupFacilUrl = `${proxyHost}/setupVolunteer`;
	const makeAdminUrl = `${proxyHost}/makeAdmin`;
	const assignUserUrl = `${proxyHost}/assignUser`;

	const cachedRequests = [];
	const requestBucket = [];

	const MAX_REQUESTS = 8;

	return class UserSaveHelper {
		static actionFields = ['host', 'facilitate', 'volunteer', 'hostCorporate', 'research', 'fundraise'];

		static proxyHost() { return proxyHost; }

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
				method: 'get',
			}, options);

			if (opts.query) {
				const queryStr = qs.stringify(opts.query);
				url = `${url}?${queryStr}`;
				delete opts.query;
			}

			const key = url;
			let requestObj = {
				key,
				created: new Date().getTime(),
			};
			requestObj.expires = requestObj.created + 2 * 1000;

			if (opts.method.toLowerCase() === 'get') {
				const cached = cachedRequests.find(x => x.key === requestObj.key);
				if (cached) {
					if (cached.expires > requestObj.created) {
						requestObj = cached;
					} else {
						requestObj = Object.assign(cached, requestObj);
					}
				}
			}

			try {
				if (!requestObj.json) {
					if (!requestObj.promise) {
						// Send the users token for authorization
						const token = getCurrentToken();
						if (token) opts.headers.Authorization = `Bearer ${token.replace(/"/g, '')}`;

						console.log('Doing fetch', url, opts);
						if (opts.body && typeof opts.body !== 'string') {
							opts.body = JSON.stringify(opts.body);
						}
						while (requestBucket.length >= MAX_REQUESTS) {
							console.log('Bucket full, waiting')
							await Promise.race(requestBucket);
						}
						requestObj.promise = fetch(url, opts);
						requestBucket.push(requestObj.promise);
					}
					const response = await requestObj.promise;

					// If there are multiuple callers, one may already have removed the
					// promise
					const indexOfPromise = requestBucket.indexOf(requestObj.promise);
					if (indexOfPromise > -1) requestBucket.splice(indexOfPromise, 1);

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

						const error = new Error(message);
						error.response = response;
						throw error;
					}

					// If the request succeeded with no JSON, that's weird
					message = 'Sorry, something unusual went wrong';

					if (!requestObj.jsonPromise) requestObj.jsonPromise = response.json();
					requestObj.json = await requestObj.jsonPromise;
				}
			} catch (error) {
				// If fetch has thrown an error the message is pretty cryptic
				// log the message for developers and give the end user a better message
				console.error(error);
				error.oldMessage = error.message;
				error.message = message;
				throw error;
			}

			return requestObj.json.data;
		}

		/**
		 * Send a payload to the sync webhook to notify it
		 * to sync some data
		 * @param {string} type Type of the event
		 * @param {object} data payload for the hook
		 */
		notifySync(type, data) {
			const webhookData = { type, data };
			console.log('Sending to conversation-sync webhook', webhookData);
			// Send the guest to be added to the backend spreadsheet
			return UserSaveHelper.doFetch(WEBHOOK_URL, {
				method: 'POST',
				body: {
					data: webhookData,
				}
			});
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

		static async makeAdmin(user) {
			return this.doFetch(makeAdminUrl, {
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

		/**
		 * Helper to assign a record to a user
		 * @param {string} userUuid
		 * @param {string} targetUuid
		 * @param {string} recordType
		 */
		static async assignUser(userUuid, targetUuid, recordType = 'user') {
			const url = `${assignUserUrl}`;
			return this.doFetch(url, {
				userUuid,
				recordUuid: targetUuid,
				recordType,
			});
		}
	};
};
