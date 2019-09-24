/**
 * This component is a helper for chaining urls together
 * use it's static helpers to generate a url with a return url encoded in the query
 * Then either place this button on the page to return when done
 * or use the static helper to extract the return url to push onto the
 * history
 *
 * @example
 * // At /conversations/list
 * const bookUrl = ReturnButton.createReturningLink({
 * 		props: this.props,
 * 		url: '/conversations/create',
 * 		done: 'booked'
 * });
 *
 * // Then at /conversations/create
 * render() {
 * 		return <ReturnButton {...props} saveLabel="Save Booking" />
 * }
 * // Generates a button that when clicked goes to /conversations/list?done=booked
 *
 * // or to go there manually from within a function:
 * const returnUrl = ReturnButton.getReturnUrl(this.props, '/defaultPage', true);
 * this.props.location.history.push(returnUrl);
 */
(RaiselyComponents, React) => {
	const { Button } = RaiselyComponents.Atoms;
	const { getQuery } = RaiselyComponents.api;
	const { get, qs } = RaiselyComponents.Common;

	function parsePath(url) {
		const split = url.indexOf('?');
		const path = split === -1 ? url : url.slice(0, split);
		const query = split === -1 ? '' : url.slice(split + 1, url.length);

		return { path, query };
	}

	function mergeQuery(url, newQuery) {
		const { path, query } = parsePath(url);
		const oldQuery = qs.parse(query);
		const mergedQuery = Object.assign(oldQuery, newQuery);
		const fullQuery = qs.stringify(mergedQuery);
		const finalUrl = `${path}?${fullQuery}`;
		return finalUrl;
	}

	/**
	 * Get the url to visit in order to return to the previous page (optionally
	 * indicate to the page that this page was completed)
	 * @param {object} query query string of the current page decoded into an object
	 * @param {string} defaultUrl URL if returnTo is not present on the query
	 * @param {boolean} isDone Has this form been completed?
	 */
	function getReturnUrl(query, defaultUrl, isDone) {
		const { onDone, returnTo } = query;
		const returnUrl = returnTo || defaultUrl;

		if (!isDone) return returnUrl;

		return mergeQuery(returnUrl, { done: onDone });
	}

	return class ReturnButton extends React.Component {
		/**
		 * Get the query from the props and determine the return to url
		 * (optionally indicate to the page that this page was completed)
		 * @param {object} props props (must include router.location.search)
		 * @param {string} defaultUrl URL if returnTo is not present on the query
		 * @param {boolean} isDone Has this form been completed?
		 * @return {string} The return url extracted from the query
		 */
		static getReturnUrl(props, defaultUrl, isDone) {
			const query = getQuery(get(props, 'router.location.search'));

			return getReturnUrl(query, defaultUrl, isDone);
		}

		/**
		 * If you're at a url that received returnTo, but you want to go
		 * somewhere else first and then return, this does the magic
		 *
		 * ie
		 * firstUtr -> secondUrl?returnTo -> thirdUrl?returnTo -> firstUrl
		 * use this if you are here ^
		 * @param {object} props Include router.location.search
		 * @param {string} url The url to add place returnTo and done params on
		 * @return {string} The url with returnTo merged into the query
		 */
		static forwardReturnTo({ props, url }) {
			const query = getQuery(get(props, 'router.location.search'));
			const { onDone, returnTo } = query;
			return this.createReturningLink({ returnTo, done: onDone, url });
		}

		/**
		 * Generate a url that encodes the current url to in returnTo query
		 * to return to a given page once the form on that page is done
		 * If returnTo is not specified then the current page is used
		 *
		 * @param {object} options.props props (must include router.location)
		 * @param {string} options.url The url to visit (and encode returnTo on)
		 * @param {boolean} options.done Value to pass back to this page in the done query if
		 * the page completes
		 * @param {string} options.returnTo Page to return to after done (null for current page)
		 * @return {string} The url to visit with returnTo on the query
		 */
		static createReturningLink({ props, url, done, returnTo }) {
			let thisPage = returnTo;
			if (!thisPage) {
				const { pathname, search } = get(props, 'router.location');
				thisPage = `${pathname}${search.startsWith('?') ? '' : '?'}${search}`;
			}

			return mergeQuery(url, {
				returnTo: thisPage,
				onDone: done,
			});
		}

		render() {
			const values = {...this.props, ...this.props.getValues() };
			const { backLabel, saveLabel, saveTheme, backTheme } = values;
			const defaultUrl = values.defaultUrl || '/dashboards';
			const query = getQuery(get(this.props, 'router.location.search'));

			const backUrl = getReturnUrl(query, defaultUrl);
			const saveUrl = getReturnUrl(query, defaultUrl, true);

			return (
				<div>
					{ backLabel ? <Button theme={backTheme} href={backUrl}>{backLabel}</Button> : '' }
					{ saveLabel ? <Button theme={saveTheme} href={saveUrl}>{saveLabel}</Button> : '' }
				</div>
			);
		}
	};
};
