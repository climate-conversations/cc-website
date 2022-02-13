/**
 * Logs the user in with a full admin login token so they can access all
 * features of the API through the portal
 */
(RaiselyComponents, React) => {
	const { useEffect } = React;

	return function AdminLogin(props) {
		useEffect(() => {
			if (!document.body.classList.contains('components-loaded')) {
				document.body.classList.add('components-loaded');
			}
		});

		let LoginForm = window.CustomComponentRaiselyLoginForm.html;

		return (
			<div>
				<LoginForm requestAdminToken {...props} />
			</div>
		);
	};
};
// class AdminLogin extends React.Component {
// 	render() {
// 		if (!document.body.classList.contains('components-loaded')) {
// 			document.body.classList.add('components-loaded');
// 		}

// 		const LoginForm = window.CustomComponentRaiselyLoginForm.html;

// 		return (
// 			<div>
// 				<LoginForm requestAdminToken {...this.props} />
// 			</div>
// 		);
// 	}
// };
