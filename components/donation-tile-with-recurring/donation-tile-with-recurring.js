(RaiselyComponents, React) => {
	const validSizes = ["small", "medium", "large"];
	const validDetailLevels = ["basic", "tile"];
	const validThemes = ["default", "inverted"];

	const { dayjs, displayCurrency, get } = RaiselyComponents.Common;

	const donationTileClass = (detail, theme, size, canThank) =>
		[
			"donation-tile",
			`donation-tile--${detail}`,
			`donation-tile--${theme}`,
			`donation-tile--${size}`,
			canThank ? "donation-tile--can-thank" : null
		]
			.filter(i => i)
			.join(" ");

	const hasProfile = donation => get(donation, "profile.path", null) !== null;

	function DonationTileActivity({
		donation,
		verb,
		campaign,
		user,
		showFullName
	}) {
		const donorDisplayName = showFullName
			? donation.fullName ||
			  `${donation.firstName} ${donation.lastName || ""}`
			: donation.firstName;
		const donorName = donation.anonymous ? "Anonymous" : donorDisplayName;

		return (
			<p className="donation-tile__content__activity">
				<span className="donation-tile__content__donor">{`${donorName}`}</span>
				<span> {verb}</span>
				{/* <Link to={`/${donation.profile.path}`}>
						{donation.profile.name}
					</Link> */}
			</p>
		);
	}

	return function DonationTile({
		donation,
		detail,
		theme,
		size,
		campaign,
		user,
		showAsLoading,
		showFullName,
		displayThanks,
		displayThanksForm,
		onThanksSuccess,
		onThanksFailure,
		actions
	}) {
		if (!donation) return null;
		const donationSize = validSizes.includes(size) ? size : "medium";

		const donationDetail = validDetailLevels.includes(detail)
			? detail
			: "basic";
		const donationTheme = validThemes.includes(theme) ? theme : "default";

		const displayAmount = !showAsLoading
			? displayCurrency(donation.amount, donation.currency)
			: " ";

		const verb =
			donation.processing === "RECURRING"
				? "made a recurring donation 💖"
				: "donated";

		switch (donationDetail) {
			case "tile":
			case "basic":
				return (
					<div
						className={donationTileClass(
							donationDetail,
							donationTheme,
							donationSize,
							false
						)}
					>
						{showAsLoading && (
							<SlimContentLoading
								reverse
								style={{ height: "3rem", width: "100%" }}
							/>
						)}
						{!showAsLoading && (
							<div className="donation-tile__amount">
								<span>{displayAmount}</span>
							</div>
						)}
						{!showAsLoading && (
							<div className="donation-tile__content">
								<DonationTileActivity
									donation={donation}
									user={user}
									campaign={campaign}
									displayAmount={displayAmount}
									showFullName={showFullName}
									verb={verb}
								/>
								<p className="donation-tile__content__timestamp">
									{dayjs(donation.createdAt).fromNow()}
								</p>
								{donation.message && (
									<p className="donation-tile__content__message">
										<em>{`"${donation.message}"`}</em>
									</p>
								)}
								{/* {donation.user && user.uuid === donation.user.uuid && (
								<Button
									onClick={(e) =>
										resendReceipt(e, donation, actions)
									}
									className="donation-tile__content__resend"
								>
									Re-send my Receipt
								</Button>
							)} */}
							</div>
						)}
					</div>
				);
			default:
				return "";
		}
	};
};
