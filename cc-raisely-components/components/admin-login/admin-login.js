(RaiselyComponents, React) => class AdminLogin extends React.Component {
	render() {
		return <RaiselyComponents.ClientComponents.LoginForm requestAdminToken {...this.props} />
	}
}
