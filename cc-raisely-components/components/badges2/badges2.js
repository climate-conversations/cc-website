/**
  * A list of badge ids to display
  * @field {text} badges one or more of motivation,recruit,host,lung
  */

// eslint-disable-next-line no-unused-expressions
(RaiselyComponents, React) => {
	/**
	 * Define your badges
	 * isActive is a function that takes the profile and the state, and
	 * returns true or false indicating if the badge
	 * is active for the current profile
	 */
	const badgeConfig = [{
		id: 'switched',
		name: 'Switched On!',
		isActive: p => p && p.public && p.public.switchOnConfirmed,
		// Images for active/inactive badge
		active: 'https://raisely-images.imgix.net/switchon/uploads/badge-switchon-2-png.png',
		inactive: 'https://raisely-images.imgix.net/switchon/uploads/badge-switchon-1-png.png',
		description: 'Has switched themselves to green electricity',
	}, {
		id: 'motivation',
		name: 'Shared Why',
		isActive: p => p && p.description,
		// Images for active/inactive badge
		active: 'https://raisely-images.imgix.net/switchon/uploads/badge-sharedmotivation-2-png.png',
		inactive: 'https://raisely-images.imgix.net/switchon/uploads/badge-sharedmotivation-1-png.png',
		description: "Has shared why they're acting",
	}, {
		id: 'recruit',
		name: 'Recruited a Friend',
		isActive: (p, state) => state.recruited,
		active: 'https://raisely-images.imgix.net/switchon/uploads/badge-switchon-2-png.png',
		inactive: 'https://raisely-images.imgix.net/switchon/uploads/badge-switchon-1-png.png',
		description: 'Has successfully recruited 1 friend',
	}, {
		id: 'host',
		name: 'Inspiration',
		isActive: p => p && p.public && p.public.hosted,
		active: 'https://raisely-images.imgix.net/switchon/uploads/badge-inspiration-2-png.png',
		inactive: 'https://raisely-images.imgix.net/switchon/uploads/badge-inspiration-1-2-png.png',
		description: 'Has hosted a climate conversation',
	}, {
		id: 'lung',
		name: 'Lung Saver',
		isActive: (p, state) => (state.recruited >= 5),
		active: 'https://raisely-images.imgix.net/switchon/uploads/badge-lungsaver-2-png.png',
		inactive: 'https://raisely-images.imgix.net/switchon/uploads/badge-lungsaver-1-2-png.png',
		description: 'Has switched 5 or more people!',
	}];

	/**
	 * Once you've declared your required components, be sure to return the class
	 * representing your final Raisely Component so it can be shown on your page.
	 */
	return class BadgesComponent extends React.Component {
		state = {
			recruited: null,
		}

		/**
		  * Load any additional information needed for the badges
		  */
		componentDidMount() {
		}

		/**
		  * This fetches the number of profiles that are membes of this profile
		  * which can then be used to create badges around how many people are recruited
		  */
		loadRecruits(profile) {
			if (!profile) return;

			// Only reload if the state has yet to be fetched
			if (this.state.recruited === null) {
				fetch(`https://api.raisely.com/v3/profiles/${profile.uuid}/members?public.switchOnConfirmed=yes`)
					.then(response => response.json())
					.then((body) => {
						if (!body.pagination) {
							console.log('Error fetching recruits', body);
						} else {
							this.setState({ recruited: body.pagination.total });
						}
					});
			}
		}

		render() {
			const profile = this.props.global.current.profile || this.props.global.user.profile || {};

			const values = this.props.getValues();

			this.loadRecruits(profile);

			// Show selected badges, or all badges
			values.badges =
				(values.badges && values.badges.split(',').map(b => b.trim())) ||
				badgeConfig.map(b => b.id);

			const badges = badgeConfig
				// Show only selected badges
				.filter(badge => values.badges.includes(badge.id))
				// render each selected badge
				.map((badge) => {
					let isActive = false;
					if (badge.isActive) isActive = badge.isActive(profile, this.state);
					const url = isActive ? badge.active : badge.inactive;

					const fullUrl = `${url}?w=200`;

					// note: we add a key prop here to allow react to uniquely identify each
					// element in this array. see: https://reactjs.org/docs/lists-and-keys.html
					return (
						<div
							className={`badge ${isActive ? 'active' : 'inactive'}`}
						>
							<img
								src={fullUrl}
								key={badge.name}
								alt={badge.description} />
							<h5>{badge.name}</h5>
						</div>
					);
				});

			return (
				<div className="badges">
					{badges}
				</div>
			);
		}
	};
};
