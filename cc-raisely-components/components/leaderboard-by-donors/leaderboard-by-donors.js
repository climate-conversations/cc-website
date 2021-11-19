/**
 * Leader Board by Donors
 * Display profiles by unique donors
 *
 * Define the following fields for the custom component
 *
 * @field {select} profileType individual, group
 * @field {select} parentFrom campaign,page
 * @field {select} list members,all
 * @field {boolean} showRank
 * @field {text} header The header text
 * @field {text} headerTag h1,h2,h3,h4,h5,h6s
 * @field {select} size small, medium or large
 * @field {select} style standard, hollow, rounded
 * @field {select} statPosition top, middle or bottom
 * @field {boolean} showTotal
 * @field {text} totalLabel 'donors',
 */

// eslint-disable-next-line no-unused-expressions
(RaiselyComponents, React) => {
	/**
	 * This is the closure area of your custom component, allowing you to
	 * specify and declare code used by your main component. This allows for
	 * a greater amount of complexity in your components while ensuring your
	 * component performs correctly.
	 */

	/**
	 * The api can be accessed from the RaiselyComponents object, along with various
	 * internal Raisely Components
	 */
	const { api, Atoms, Common, Spinner } = RaiselyComponents;
	const { get } = Common;
	const { ProgressBar } = Atoms;
	const { useState, useEffect } = React;

	const defaults = {
		size: 'medium',
		style: 'standard',
		statPosition: 'top',
		totalText: 'donors',
		headerTag: 'h3',
	};

	const ProfileImage = (props) => {
		const colouredIcons = [
			'https://raisely-images.imgix.net/fundraise-for-climate-conversations-staging/uploads/whatsapp-group-icon-pri-09-jpg-16f1c4.jpg',
			'https://raisely-images.imgix.net/fundraise-for-climate-conversations-staging/uploads/whatsapp-group-icon-pri-08-jpg-e7d10d.jpg',
			'https://raisely-images.imgix.net/fundraise-for-climate-conversations-staging/uploads/whatsapp-group-icon-pri-06-jpg-d7bcbe.jpg',
			'https://raisely-images.imgix.net/fundraise-for-climate-conversations-staging/uploads/whatsapp-group-icon-pri-05-jpg-5f8945.jpg',
			'https://raisely-images.imgix.net/fundraise-for-climate-conversations-staging/uploads/whatsapp-group-icon-pri-04-jpg-e2930a.jpg',
			'https://raisely-images.imgix.net/fundraise-for-climate-conversations-staging/uploads/whatsapp-group-icon-pri-02-jpg-7f2c07.jpg',
		];

		const { profile, index } = props;

		const fallbackImage = colouredIcons[index % colouredIcons.length];
		const image = profile.photoUrl || fallbackImage;

		const style = { backgroundImage: `url(${image})` };

		return (
			<div className="profile-image profile-image--size-normal profile-image--align-left">
				<div className="profile-image__photo" style={style} />
			</div>
		);
	};

	const ProfileTile = (props) => {
		const {
			size,
			showTotal,
			statPosition, // top, middle or bottom
			totalLabel,
			profile,
			mock,
			goal,
			index,
		} = props;

		// FIXME put rank on profile image
		const headerText = profile.name;

		const action = () => props.history.push(`/${profile.path}`);

		const donorCount = get(profile, 'public.uniqueDonors', 0);

		return (
			<div className="profilelist__item">
				<div className="profile-tile profile-tile--detail-default">
					<a
						className="profile-tile__overlay"
						href={`/${profile.path}`}
					>
						Link to {profile.name}
					</a>
					<ProfileImage profile={profile} index={index} />
					<div className="profile-tile__content">
						<p className="profile-tile__name">{headerText}</p>
						<span class="profile-tile__total">
							{showTotal && donorCount
								? `${donorCount} ${totalLabel}`
								: ''}
						</span>
						<ProgressBar
							size={size}
							statPosition={statPosition}
							showTotal={false}
							showGoal={false}
							isPreview={mock}
							goal={goal}
							displaySource="custom"
							total={get(profile, 'public.uniqueDonors', 0)}
						/>
						{profile.rank && donorCount ? (
							<div className="profile-tile__rank">
								{profile.rank}
							</div>
						) : (
							undefined
						)}
					</div>
				</div>
			</div>
		);
	};

	const mockProfiles = [
		{
			name: 'Farheen',
			public: {
				uniqueDonors: 5,
			},
		},
		{
			name: 'Daveed Muthukameer',
			public: {
				uniqueDonors: 3,
			},
		},
		{
			name: 'Lilly Sim',
			public: {
				uniqueDonors: 0,
			},
		},
	];

	return function Leaderboard(props) {
		const [profiles, setProfiles] = useState();
		const [highestTotal, setHighestTotal] = useState(5);
		const [fetching, setFetching] = useState();

		const values = props.getValues();
		const { global } = props;
		const { campaign } = global;
		const { mock } = campaign;

		let parentProfile;
		if (values.parentFrom === 'campaign') {
			({ profile: parentProfile } = campaign);
		} else {
			({ profile: parentProfile } = global.current);
		}

		Object.keys(defaults).forEach((key) => {
			if (values[key] === null) values[key] = defaults[key];
		});

		const {
			profileType,
			list,
			size,
			showTotal,
			statPosition,
			style,
			totalLabel,
			header,
			headerTag,
			showRank,
		} = values;

		/**
		 * Add a rank to the profile records
		 * ensuring that profiles with the same donorCount
		 * have the same rank
		 */
		const rankAndSetProfiles = (newProfiles) => {
			let rank = 0;
			let prevCount;
			let highestDonorCount = 0;
			newProfiles.forEach((profile) => {
				const donorCount = get(profile, 'public.uniqueDonors', 0);
				if (showRank) {
					// Increment the rank unless this is the same rank
					// as the previous profile
					if (donorCount !== prevCount) rank += 1;
					profile.rank = rank;
					prevCount = donorCount;
				}
				if (donorCount > highestDonorCount)
					highestDonorCount = donorCount;
			});
			setProfiles(newProfiles);
			setHighestTotal(Math.max(5, highestDonorCount));
		};

		const fetchModels = async () => {
			// Don't duplicate fetches
			if (fetching) return;

			if (mock) {
				rankAndSetProfiles(mockProfiles);
				return;
			}

			console.log('loading?', parentProfile);

			if (!parentProfile) return;

			setFetching(true);

			let result;

			let query = {
				sort: 'public.uniqueDonors',
				order: 'DESC',
			};

			if (list === 'members') {
				result = await api.profiles.members.getAll({
					query,
					id: parentProfile.uuid,
				});
			} else {
				query.type =
					profileType && profileType === 'group'
						? 'GROUP'
						: 'INDIVIDUAL';

				result = await api.profiles.getAll({
					query,
				});
			}

			rankAndSetProfiles(result.body().data().data);
		};

		useEffect(() => {
			fetchModels();
		}, [parentProfile]);

		if (!profiles) {
			return <Spinner />;
		}

		const HeaderTag = `${headerTag || 'h3'}`;

		const headerText =
			header &&
			header.replace(/\{name\}/g, get(parentProfile, 'name', ''));

		return (
			<div className="leaderboard profilelist--default profilelist">
				{header && profiles.length ? (
					<HeaderTag>{headerText}</HeaderTag>
				) : (
					''
				)}
				<div className="paginated-items">
					{profiles.map((profile, index) => (
						<ProfileTile
							profile={profile}
							size={size}
							showTotal={showTotal}
							statPosition={statPosition}
							style={style}
							totalLabel={totalLabel}
							mock={mock}
							goal={highestTotal}
							index={index}
						/>
					))}
				</div>
			</div>
		);
	};
};
