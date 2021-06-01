(RaiselyComponents, React) => {
	const { Share } = RaiselyComponents.Molecules;

	const validNetworks = [
		"facebook",
		"twitter",
		"whatsapp",
		"email",
		"linkedin",
		"link"
	];

	return function CustomShare(props) {
		const values = props.getValues();
		const { networks, size, theme, url } = values;
		const networksArray = (networks || "")
			.split(",")
			.filter(n => validNetworks.includes(n));
		return (
			<Share
				networks={networksArray}
				theme={theme}
				size={size}
				url={url}
			/>
		);
	};
};
