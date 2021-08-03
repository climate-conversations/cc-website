/**
 * Display a button that links to the raisely admin record
 * @prop {string} recordType the type of record to link to (user, profile)
 * @prop {string} uuid The uuid of the record to link to (set to null to link to the index page)
 * @prop {string} size small, medium, large
 */
(RaiselyComponents, React) => {
	const { Link } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { get } = RaiselyComponents.Common;
	const plural = word => ((word.slice(word.length - 1) === 's') ? word : `${word}s`);

	function RaiselyLogo({ size }) {
		const sizeMap = {
			small: 30,
			medium: 27,
			large: 54,
		};
		const width = sizeMap[size] || sizeMap.small;

		return (
			<svg className="raisely--button__logo" width={width} height={width} xmlns="http://www.w3.org/2000/svg">
				<path d="M22.548 20.18l-9.047-10.172-9.059 10.158A11.19 11.19 0 0 1 2.25 13.5C2.25 7.296 7.296 2.25 13.5 2.25S24.75 7.295 24.75 13.5c0 2.499-.819 4.81-2.202 6.68M13.5 24.75a11.207 11.207 0 0 1-7.54-2.907L13.5 13.39l7.528 8.464a11.206 11.206 0 0 1-7.527 2.897M0 13.5C0 20.956 6.044 27 13.5 27S27 20.956 27 13.5 20.956 0 13.5 0 0 6.044 0 13.5z" fill="currentColor" fillRule="evenodd" />
			</svg>
		);
	}

	return function RaiselyButton(props) {
		const values = (props.getValues && props.getValues()) || {};
		const settings = Object.assign({
			size: 'small',
		}, props, values);
		// eslint-disable-next-line object-curly-newline
		const { props: parentProps, label, uuid, recordType, size, href } = settings;

		const typeMap = {
			user: 'people',
		};

		let recordPath;
		if (recordType) {
			recordPath = typeMap[recordType] || plural(recordType);
			if (!recordPath) throw Error('Unknown record type passed to Raisely button!');
		}

		const prefix = recordPath === 'people' ? '' :
			`campaigns/${get(parentProps || props, 'global.campaign.path')}/`;

		let url;
		if (href) {
			url = href.startsWith('https') ? href :
				`https://admin.raisely.com/${href}`;
		} else {
			url = `https://admin.raisely.com/${prefix}${recordPath}/${uuid || ''}`;
		}
		const Element = label ? Button : Link;
		return (
			<Element className="raisely--button" href={url} target="raisely" size={size}>
				<RaiselyLogo size={size} />
				{label || ''}
			</Element>
		);
	};
};
