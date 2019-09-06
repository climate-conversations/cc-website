(RaiselyComponents, React) => {
	const { Link } = RaiselyComponents;

	function RaiselyLogo({ size }) {
		const sizeMap = {
			small: 15,
			medium: 27,
			large: 54,
		};
		const width = sizeMap[size] || sizeMap.small;

		return (
			<svg width={width} height={width} xmlns="http://www.w3.org/2000/svg">
				<path d="M22.548 20.18l-9.047-10.172-9.059 10.158A11.19 11.19 0 0 1 2.25 13.5C2.25 7.296 7.296 2.25 13.5 2.25S24.75 7.295 24.75 13.5c0 2.499-.819 4.81-2.202 6.68M13.5 24.75a11.207 11.207 0 0 1-7.54-2.907L13.5 13.39l7.528 8.464a11.206 11.206 0 0 1-7.527 2.897M0 13.5C0 20.956 6.044 27 13.5 27S27 20.956 27 13.5 20.956 0 13.5 0 0 6.044 0 13.5z" fill="currentColor" fillRule="evenodd" />
			</svg>
		);
	}

	return function RaiselyButton({ uuid, recordType, size }) {
		const typeMap = {
			user: 'people',
		};

		// eslint-disable-next-line no-param-reassign
		size = size || 'small';
		const recordPath = typeMap[recordType];
		if (!recordPath) throw Error('Unknown record type passed to Raisely button!');


		const url = `https://admin.raisely.com/${recordPath}/${uuid}`;
		return (
			<Link href={url} target="raisely">
				<RaiselyLogo size={size} />
			</Link>
		);
	};
};
