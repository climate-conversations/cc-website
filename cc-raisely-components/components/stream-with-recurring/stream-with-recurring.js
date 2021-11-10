(RaiselyComponents, React) => {
	const { api, Link } = RaiselyComponents;
	const { dayjs, get, isProfileOwnedByUser } = RaiselyComponents.Common;
	const DonationTile = RaiselyComponents.import(
		'donation-tile-with-recurring'
	);
	const { Fragment } = React;
	const { Pagination, SelfContained } = RaiselyComponents.Modules;

	const validDirections = ['vertical', 'horizontal', 'grid'];
	const validSort = ['createdAt', 'amount'];
	const validOrder = ['desc', 'asc'];

	const donationStreamClass = (direction, isPaginated, customClass) => {
		return `donation-stream donation-stream--direction-${direction} ${
			isPaginated ? 'donation-stream--paginated ' : ''
		}${customClass}`;
	};

	const mockResponse = (obj) =>
		Promise.resolve({
			body() {
				return {
					data() {
						return {
							data: obj,
							pagination: { total: obj.length },
							mock: true,
						};
					},
				};
			},
			result() {
				return obj;
			},
		});

	/**
	 * Resolves optional query props to defaults
	 * @param  {Object} props Ref to Component.props
	 * @return {Object} Resolved values of the optional query parameters
	 */
	const resolveQueryParams = (props = {}, offset = 0, returnHighest) => {
		const profileIsOwnedByLoggedInUser =
			props.user && isProfileOwnedByUser(props.user, props.profile);

		const query = {
			offset,
			limit: props.limit && props.limit > 0 ? props.limit : 10,
			sort: validSort.includes(props.sort) ? props.sort : validSort[0],
			order: validOrder.includes(props.order)
				? props.order
				: validOrder[0],
			highlight: props.highlight,
			includePrivate:
				props.displayThanksForm && profileIsOwnedByLoggedInUser
					? 'thankyou'
					: undefined,
		};

		if (!returnHighest) return query;

		return {
			...query,
			// override set values for limit and order - always show top
			limit: 1,
			sort: 'amount',
			order: 'desc',
		};
	};

	const mockDonations = (length) => {
		const result = Array.from(Array(parseInt(length))).map(
			(item, index) => ({
				uuid: 'aa-index',
				amount: 1000,
				firstName: 'Example',
				lastName: 'Donor',
				fullName: 'Example Donor',
				preferredName: 'Example',
				processing: !!(index % 2) ? 'RECURRING' : 'ONCE',
				currency: 'AUD',
				profile: {
					// TODO: mock this profile page or make it 404 correctly
					name: 'Team Incredible',
					path: 'team-incredible',
				},
				createdAt: dayjs()
					.subtract(5 * index, 'minutes')
					.format(),
			})
		);

		return result;
	};

	const pollingMethod = async (props, offset, returnHighest = false) => {
		const { campaign, profile } = props;

		console.log('props', props);
		if (campaign.mock) {
			const value = mockResponse(mockDonations(props.limit));
			return value;
		}

		const query = {
			private:
				props.isUser &&
				props.global &&
				props.global.user &&
				props.user.uuid === props.global.user.uuid,
		};

		if (props.isUser) {
			query.user = props.user.uuid;
		} else {
			query.campaign = campaign.uuid;
			if (profile) {
				query.profile = props.profile.uuid;
			}
		}

		const result = await api.donations.getAll({
			id: props.profile.uuid,
			query: {
				...query,
				...resolveQueryParams(props, offset, returnHighest),
			},
		});
		return result;
	};

	function EmptyDonationStream() {
		return (
			<div className="donation-stream__empty">
				<p>Be the first to donate</p>
			</div>
		);
	}

	function DonationStreamItem({ donation, ...rest }) {
		return (
			<div className="donation-stream__item">
				{rest.hasCustomRender ? (
					rest.renderDonation(donation, rest.showAsLoading)
				) : (
					<DonationTile
						donation={donation}
						campaign={rest.campaign}
						showAsLoading={rest.showAsLoading}
						detail={rest.direction === 'grid' ? 'tile' : 'basic'}
						user={rest.user}
						showFullName={rest.showFullName}
						displayThanks={rest.displayThanks}
						displayThanksForm={rest.displayThanksForm}
						onThanksSuccess={rest.onThanksSuccess}
						onThanksFailure={rest.onThanksFailure}
						{...rest}
					/>
				)}
			</div>
		);
	}

	return function DonationStream(props) {
		const values = props.getValues();
		const { global } = props;

		const streamDirection = validDirections.includes(values.direction)
			? values.direction
			: 'horizontal';

		// change presentation layer depending if paginated
		const Presenter =
			values.direction === 'vertical' ? Pagination : SelfContained;

		// allow custom donation renderer
		const hasCustomRender = typeof props.renderDonation === 'function';

		const profile =
			get(props.global, 'current.profile') ||
			get(props.global, 'campaign.profile');

		return (
			<div
				className={donationStreamClass(
					streamDirection,
					values.isPaginated,
					values.customClass
				)}
				style={props.style}
			>
				{props.header}
				<Presenter
					avoidLoader
					{...props}
					{...values}
					profile={profile}
					campaign={props.global.campaign}
					pollingHash={values.pollingHash}
					pollingMethod={pollingMethod}
					loadHeight="76px"
					showAsLoading={
						global.loadingCurrent || !global.userAuthAttempted
					}
				>
					{(donations, { isLoading }) => {
						console.log('Donation stream', donations);
						return donations && donations.length ? (
							<Fragment>
								{streamDirection === 'horizontal' &&
								donations.length > 2 ? (
									<Fragment>
										<div
											className={`donation-stream__track donation-stream__track--items-${
												donations.length
											}`}
										>
											{donations.map((donation) => (
												<DonationStreamItem
													key={
														donation
															? donation.uuid
															: undefined
													}
													{...props}
													donation={donation}
													showAsLoading={isLoading}
													hasCustomRender={
														hasCustomRender
													}
												/>
											))}
											<div className="donation-stream__track__loop">
												{donations.map((donation) => (
													<DonationStreamItem
														key={
															donation
																? donation.uuid
																: undefined
														}
														{...props}
														donation={donation}
														showAsLoading={
															isLoading
														}
														hasCustomRender={
															hasCustomRender
														}
														user={props.user}
													/>
												))}
											</div>
										</div>
									</Fragment>
								) : (
									<Fragment>
										{donations.map((donation) => (
											<DonationStreamItem
												key={
													donation
														? donation.uuid
														: undefined
												}
												{...props}
												donation={donation}
												hasCustomRender={
													hasCustomRender
												}
												showAsLoading={isLoading}
												user={props.user}
											/>
										))}
									</Fragment>
								)}
							</Fragment>
						) : (
							<EmptyDonationStream />
						);
					}}
				</Presenter>
			</div>
		);
	};
};
