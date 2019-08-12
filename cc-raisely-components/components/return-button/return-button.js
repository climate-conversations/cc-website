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

		const fullQuery = qs.stringify(Object.assign(query, newQuery));
		const finalUrl = `${path}?${fullQuery}`;
		return finalUrl;
	}

	function getReturnUrl(query, defaultUrl, isDone) {
		const { onDone, returnTo } = query;
		const returnUrl = returnTo || defaultUrl;

		if (!isDone) return returnUrl;

		return mergeQuery(returnUrl, { done: onDone });
	}

	return class ReturnButton extends React.Component {
		static createReturningLink({ props, url, done }) {
			const { pathname, search } = get(props, 'router.location');
			const thisPage = `${pathname}${search.startsWith('?') ? '' : '?'}${search}`;

			return mergeQuery(url, {
				returnTo: thisPage,
				onDone: done,
			});
		}

		render() {
			const values = this.props.getValues();
			const { backLabel, saveLabel } = values;
			const defaultUrl = values.defaultUrl || '/dashboards';
			const query = getQuery(get(this.props, 'router.location.search'));

			const backUrl = getReturnUrl(query, defaultUrl);
			const saveUrl = getReturnUrl(query, defaultUrl, true);

			return (
				<div>
					{ backLabel ? <Button href={backUrl}>{backLabel}</Button> : '' }
					{ saveLabel ? <Button href={saveUrl}>{saveLabel}</Button> : '' }
				</div>
			);
		}
	}
}
