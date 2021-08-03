(RaiselyComponents, React) => {
	const { api } = RaiselyComponents;
	const { getData } = api;
	const { useEffect, useState } = React;
	const { get, startCase, displayCurrency } = RaiselyComponents.Common;

	const validSizes = ["small", "medium", "large"];
	const validStyles = ["standard", "hollow", "rounded"];

	const progressBarClass = variants => {
		let output = "progress-bar";
		variants.forEach(variant => {
			output += ` progress-bar--${variant[0]}-${variant[1]}`;
		});
		return output;
	};

	async function resolveDonationAmounts(
		campaign,
		profileUuid,
		commitmentMonths,
		mock
	) {
		if (!campaign)
			return {
				donatedAmount: 0,
				matchedAmount: 0,
				committedAmount: 0,
				raisedAmount: 0
			};

		if (mock) {
			const values = {
				donatedAmount: 8000,
				matchedAmount: 3000,
				committedAmount: 500 * (commitmentMonths - 1)
			};
			values.raisedAmount =
				values.donatedAmount +
				values.matchedAmount +
				values.committedAmount;
			return values;
			// profileUuid = "b6cbe770-995f-11e9-a069-0fb9e752d48b";
		}

		const [donations, subscriptions] = await Promise.all([
			getData(
				api.donations.getAll({
					query: {
						profile: profileUuid,
						campaign: campaign.uuid,
						limit: 100
					}
				})
			),
			getData(
				api.subscriptions.getAll({
					query: {
						profile: profileUuid,
						campaign: campaign.uuid,
						status: "OK",
						limit: 100
					}
				})
			)
		]);

		// Amount donated
		let donatedAmount = 0;
		// Amount from the matching pool
		let matchedAmount = 0;
		// Recurring gifts committed and will be matched
		let committedAmount = 0;

		donations.forEach(donation => {
			if (donation.processing === "ONCE") {
				const isMatched =
					donation.createdAt < "2020-12-08" &&
					donation.createdAt > "2020-12-01";
				donatedAmount += donation.campaignAmount;
				if (isMatched && matchedAmount < 500000)
					matchedAmount = Math.min(
						500000,
						matchedAmount + donation.campaignAmount
					);
				console.log(
					"don",
					donation.preferredName,
					donation.amount,
					isMatched,
					donatedAmount,
					matchedAmount
				);
			}
		});
		subscriptions.forEach(subscription => {
			const isMatched =
				subscription.createdAt < "2020-12-08" &&
				subscription.createdAt > "2020-12-01";

			const campaignAmount = subscription.amount;

			donatedAmount += campaignAmount;
			committedAmount += campaignAmount * (commitmentMonths - 1);
			// Don't count the donation just past
			if (isMatched && matchedAmount < 500000)
				matchedAmount += Math.min(
					500000,
					campaignAmount * commitmentMonths
				);
			console.log(
				"sub",
				subscription.mode,
				subscription.createdAt,
				subscription.user.preferredName,
				subscription.amount,
				commitmentMonths * campaignAmount,
				isMatched,
				matchedAmount,
				committedAmount
			);
		});

		matchedAmount = Math.min(matchedAmount, 500000);

		return {
			// Amount that's donated
			donatedAmount,
			// Matched pool used
			matchedAmount,
			// Committed from subscriptions
			committedAmount,
			raisedAmount: donatedAmount + committedAmount
		};
	}

	return function MatchedGivingProgressBar({
		// profile or campaign
		global,
		getValues,
		isEditing
	}) {
		const [totals, setTotals] = useState({});

		const { campaign } = global;
		const profileUuid = get(
			global,
			"current.profile.uuid",
			"b6cbe770-995f-11e9-a069-0fb9e752d48b"
		);
		const goal = get(global, "current.profile.goal", 1);

		const values = getValues();

		const {
			commitmentMonths,
			statPosition,
			className,
			size,
			style,
			showDonated,
			showGoal,
			showMatched,
			showCommitted,
			showRaised
		} = values;

		const barSize = validSizes.includes(size) ? size : "medium";
		const barStyle = validStyles.includes(style) ? style : "standard";
		const showStats =
			showDonated ||
			showMatched ||
			showCommitted ||
			showRaised ||
			showGoal;

		async function load() {
			try {
				const amounts = await resolveDonationAmounts(
					campaign,
					profileUuid,
					commitmentMonths,
					isEditing
				);
				setTotals(amounts);
			} catch (e) {
				console.error(e);
			}
		}

		useEffect(() => {
			load();
		}, [profileUuid, commitmentMonths, isEditing]);

		// Calculate percentage totals, ensuring all
		// 3 bars combined never exceed 100
		const donatedPercent = Math.min(
			(totals.donatedAmount * 100) / goal,
			100
		);
		const matchedPercent = Math.min(
			(totals.matchedAmount * 100) / goal + donatedPercent,
			100
		);
		const committedPercent = Math.min(
			(totals.committedAmount * 100) / goal + matchedPercent,
			100
		);

		const labels = {
			raised: "committed"
		};

		const renderAmount = (amount, name) =>
			values[`show${startCase(name)}`] && (
				<span
					className={`progress-bar__total-${name}`}
					data-total={`${totals.donatedAmount}`}
				>
					{totals.donatedAmount &&
						`${displayCurrency(amount, "SGD", {
							hideCents: true
						})} ${labels[name] || name}`}
				</span>
			);

		const progressTotalAndGoal = (
			<React.Fragment>
				{renderAmount(totals.raisedAmount, "raised")}
				{renderAmount(totals.donatedAmount, "donated")}
				{renderAmount(totals.matchedAmount, "matched")}
				{renderAmount(totals.committedAmount, "committed")}
				{renderAmount(goal, "goal")}
			</React.Fragment>
		);

		const innerBar = (amount, percentage, name) =>
			amount > 0 ? (
				<span
					className={`progress-bar__bar progress-bar__${name} progress-bar__bar--animated`}
					style={{
						width: `${Math.floor(Math.round(percentage, 100))}%`
					}}
				/>
			) : (
				undefined
			);

		console.log(
			"Rendering bar",
			donatedPercent,
			matchedPercent,
			committedPercent,
			statPosition,
			showStats
		);

		return (
			<div
				className={`${className} ${progressBarClass([
					["size", barSize],
					["style", barStyle]
				])}`}
			>
				{statPosition === "top" && showStats && (
					<div className="progress-bar__stats-outter progress-bar__stats-outter--above">
						{progressTotalAndGoal}
					</div>
				)}
				<div className="progress-bar__progress">
					{innerBar(
						totals.committedAmount,
						committedPercent,
						"committed"
					)}
					{innerBar(totals.matchedAmount, matchedPercent, "matched")}
					{innerBar(totals.donatedAmount, donatedPercent, "donated")}
				</div>
				{statPosition === "bottom" && showStats && (
					<div className="progress-bar__stats-outter progress-bar__stats-outter--below">
						{progressTotalAndGoal}
					</div>
				)}
			</div>
		);
	};
};
