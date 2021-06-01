/**
 * Logs the user in with a full admin login token so they can access all
 * features of the API through the portal
 */
(RaiselyComponents, React) => class AdminLogin extends React.Component {
	render() {
		const LoginForm = window.CustomComponentRaiselyLoginForm.html;
		return <LoginForm requestAdminToken {...this.props} />
	}
}
