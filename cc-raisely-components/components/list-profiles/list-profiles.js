(RaiselyComponents, React) => {
	const { Link, Spinner, api } = RaiselyComponents;
	const { get } = RaiselyComponents.Common;
	const { getData } = api;

	function ProfileImage({
		profile, defaultImage,
	}) {
		if (!profile) return '';
		const fallback = defaultImage && defaultImage.length > 0 ? defaultImage : 'https://storage.googleapis.com/raisely-assets/default-profile.svg';

		const backgroundImage = (profile.photoUrl || fallback) ?
			`url(${profile.photoUrl || fallback})` : null;
		return (
			<div className="profile-image">
				<div
					className="profile-image__photo"
					style={{ backgroundImage }} />
			</div>
		);
	}

	function ProfileField({ field, profile }) {
		const value = get(profile, field, '');
		const fieldClass = field.replace(/\./g, '_');
		const className = `profile-card__${fieldClass}`;

		if (field === 'name') return <h4 className={className}>{value}</h4>;

		return <div className={className}>{value}</div>;
	}

	function ProfileItem({ profile, fields, defaultImage }) {
		const quote = get(profile, 'user.public.quote');
		const showQuote = fields.includes('user.public.quote') && quote;

		return (
			<div className="profile-grid__item">
				<div className="profile-card">
					<ProfileImage
						defaultImage={defaultImage}
						profile={profile}
					/>
					<div className="profile-card__content">
						{fields
							.filter(field => !field.endsWith('quote'))
							.map(field => <ProfileField field={field} profile={profile} />) }
					</div>
					{showQuote ? (
						<div className="profile-card__quote quote__text quote--primary quote__text--size-undefined">
							{quote}
						</div>
					) : ''}
					{/* <Link className="profile-tile__overlay" to={`/${profile.path}`}>
						{`Link to ${profile.name}`}
					</Link> */}
				</div>
			</div>
		);
	}

	return class ProfileList extends React.Component {
		state = { loading: true };

		componentDidMount() {
			this.load();
		}
		componentDidUpdate() {
			const conditions = get(this.props.getValues(), 'conditions', []);
			const conditionsJSON = JSON.stringify(conditions);
			if (this.state.conditionsJSON !== conditionsJSON) {
				this.setState({ conditionsJSON });
				this.load();
			}
		}

		async load() {
			this.setState({ loading: true });
			try {
				const conditions = get(this.props.getValues(), 'conditions', []);
				this.setState({ conditions: JSON.stringify(conditions) });
				const query = {
					order: 'ASC',
				};
				if (conditions) {
					conditions.forEach((c) => { query[c.field] = c.value; });
				}
				const profiles = await getData(api.profiles.getAll({ query }));
				this.setState({ profiles, loading: false });
			} catch (e) {
				console.error(e);
				this.setState({ loading: false, error: e.message });
			}
		}

		render() {
			const fields = get(this.props.getValues(), 'fields', '').split(',');
			const { profiles, loading, error } = this.state;

			if (loading) return <Spinner />;
			if (error) return <p>{error}</p>;

			return (
				<div className="profile-grid profile-grid--limit-5">
					<div className="paginated-items">
						{profiles.map(profile => (
							<ProfileItem profile={profile} fields={fields} />
						))}
					</div>
				</div>
			);
		}
	};
};
