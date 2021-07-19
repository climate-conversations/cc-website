/**
 * Logs the user in with a full admin login token so they can access all
 * features of the API through the portal
 */
(RaiselyComponents, React) =>
	class AdminLogin extends React.Component {
		render() {
			if (!document.body.classList.contains('components-loaded')) {
				document.body.classList.add('components-loaded');
			}

			const LoginForm = window.CustomComponentRaiselyLoginForm.html;
			return <LoginForm requestAdminToken {...this.props} />;
		}
	};
