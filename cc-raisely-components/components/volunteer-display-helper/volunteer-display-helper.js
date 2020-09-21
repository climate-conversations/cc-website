RaiselyComponents => {
	const { api } = RaiselyComponents;
	const { get } = RaiselyComponents.Common;
	const { getData } = api;

	return class VolunteerDisplayHelper extends React.Component {
		state = {};
		componentDidMount() {
			this.load();
		}

		addClasses(classList) {
			const toAdd = [];
			classList.forEach(c => {
				if (!document.body.classList.contains(c)) {
					document.body.classList.add(c);
				}
			});
		}

		checkAdminStatus = () => {
			const { roles } = this.state;
			const classList = [];

			const isAdmin = get(this.props, "global.user.isAdmin", false);
			const isOrgAdmin = (roles || []).includes("ORG_ADMIN");
			if (isAdmin) classList.push("is-admin");
			if (isOrgAdmin) classList.push("is-org-admin");
			const tags = _.get(this.props, "global.user.tags", []);
			if (tags.find(t => t.path === "facilitator")) {
				classList.push("facilitator");
			}
			if (tags.find(t => t.path === "team-leader")) {
				classList.push("team-leader");
			}
			this.setState({ isOrgAdmin, isAdmin });
			this.addClasses(classList);
		};

		async load() {
			if (get(this.props, "global.campaign.mock")) {
				this.setState({
					isAdmin: true,
					isOrgAdmin: true
				});
				const classList = [
					"is-org-admin",
					"is-admin",
					"is-facilitator",
					"is-team-leader"
				];
				this.addClasses(classList);
			} else {
				try {
					// Add what classes we can before load so some things show already
					this.checkAdminStatus();
					const [authenticate] = await Promise.all([
						getData(api.users.authenticate())
					]);
					this.setState(
						{ roles: authenticate.roles },
						this.checkAdminStatus
					);
				} catch (e) {
					console.error(e);
					this.setState({ error: e.message || "Failed to load" });
				}
			}
		}

		render() {
			return (
				<p className="editor-only">&lt;Volunteer Display Helper&gt;</p>
			);
		}
	};
};
