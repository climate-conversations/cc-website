(RaiselyComponents, React) => {
	const FacilitatorRef = RaiselyComponents.import('facilitator', { asRaw: true });
	let Facilitator;

	return class RedirectHelper extends React.Component {
		componentDidMount() {
			this.doRedirect();
		}

		async doRedirect() {
			const { mock } = this.props.global.campaign;
			// Don't redirect in the editor;
			if (mock) return;

			const { redirectTo } = this.props.getValues();
			let path;

			if (!Facilitator) Facilitator = FacilitatorRef().html;
			if (redirectTo === 'facilitator') {
				const profile = await Facilitator.getFacilitatorProfile(this.props);
				if (profile) path = profile.path;
			} else {
				const teams = await Facilitator.getTeams();
				if (teams && teams.length) path = teams[0].path;
			}

			if (!path) path = '/dashboard';

			this.props.history.push(path);
		}

		render() {
			const { redirectTo } = this.props.getValues();
			let to = redirectTo === 'facilitator' ? 'facilitator dashboard' : 'team dashboard';

			const { mock } = this.props.global.campaign;

			return (
				<div>
					<h4>Redirecting to {to}</h4>
					{mock ? (
						<p>(Not redirecting in editor)</p>
					) : ''}
				</div>
			)
		}
	};
}
