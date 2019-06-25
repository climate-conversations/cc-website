// eslint-disable-next-line no-unused-expressions
(RaiselyComponents, React) => {

	/**
	 * Once you've declared your required components, be sure to return the class
	 * representing your final Raisely Component so it can be shown on your page.
	 */
	return (props) => {
		const { Atoms } = RaiselyComponents;
		const { Button } = Atoms;

		if (!props.global.user) {
			return (
				<div>
					<p>
						Sorry, we could not log you in. Maybe your magic link has expired?
					</p>
					<div className="buttons">
						<Button
							href="/reset">
							Send me a new link!
						</Button>
					</div>
				</div>
			);
		}

		const { profile } = props.global.user;

		let label = 'the confirmation page';
		let path = '/confirm';

		if (profile.public && profile.public.switchOnHasGoal) {
			label = 'your dashboard';
			path = '/dashboard';
		}

		// History is missing in the editor
		if (props.history) props.history.push(path);

		return (
			<div>
				<p>
					Loading {label} ...
				</p>
			</div>
		);
	};
};
