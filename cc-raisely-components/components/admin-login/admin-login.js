/**
 * Logs the user in with a full admin login token so they can access all
 * features of the API through the portal
 */
(RaiselyComponents, React) => {
	const { useEffect, useState } = React;

	return function AdminLogin(props) {
		const [emailState, setEmailState] = useState('');
		const [passwordState, setPasswordState] = useState('');
		const [isPasswordVisible, setIsPasswordVisible] = useState(false);
		const [passcode2FaState, setPasscode2FaState] = useState('');

		const handleInputChange = (e, updateState) => {
			updateState(e.target.value);
		};

		useEffect(() => {
			if (!document.body.classList.contains('components-loaded')) {
				document.body.classList.add('components-loaded');
			}
		});

		const login = async () => {
			const options = {
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email: '',
					username: emailState,
					password: passwordState,
					requestAdminToken: true,
					organisationUuid: '8c179990-dbe6-11eb-b7e8-d9f47d73a6a0',
				}),
			};

			return await fetch(
				'https://api.raisely.com/v3/login?campaign=00f6ba70-dbe7-11eb-b7e8-d9f47d73a6a0',
				options
			)
				.then((response) => response.json())
				.then((response) => console.log(response))
				.catch((err) => console.error(err));
		};

		let LoginForm = window.CustomComponentRaiselyLoginForm.html;
		return (
			<div>
				<div id="my-unique-form" className="raisely-login">
					<form
						data-form-uuid="5bb97550-28ee-4d42-b10f-5ac494b0a1b1"
						onSubmit={login}
					>
						<div class="field-wrapper field-wrapper--username">
							<div class="form-field form-field--text form-field--empty form-field--valid">
								<div class="form-field__required">
									<i
										class="form-field__required__icon"
										aria-label="Required"
									>
										✱
									</i>
								</div>
								<label for="username">
									<span class="form-field__label-text">
										Email
									</span>
								</label>
								<input
									name="username"
									type="email"
									value={emailState}
									onChange={(e) =>
										handleInputChange(e, setEmailState)
									}
								/>
							</div>
						</div>
						<div class="field-wrapper field-wrapper--password">
							<div class="form-field form-field--text form-field--password form-field--empty form-field--valid">
								<label for="password">
									<span class="form-field__label-text">
										Password
									</span>
								</label>
								<div class="form-field__required">
									<i
										class="form-field__required__icon"
										aria-label="Required"
									>
										✱
									</i>
								</div>
								<input
									name="password"
									type={
										isPasswordVisible ? 'text' : 'password'
									}
									value={passwordState}
									onChange={(e) =>
										handleInputChange(e, setPasswordState)
									}
								/>
								<button
									class="form-field--password__toggle"
									tabindex="-1"
									type="button"
									onClick={() =>
										setIsPasswordVisible(!isPasswordVisible)
									}
								>
									<i
										class="material-icons"
										data-icon-name="visibility"
										title={
											isPasswordVisible
												? 'Hide password'
												: 'Show password'
										}
									>
										{isPasswordVisible
											? 'visibility'
											: 'visibility_off'}
									</i>
								</button>
							</div>
						</div>
						<div class="form__navigation">
							<button
								type="submit"
								class="button button--standard button--primary"
							>
								Login
							</button>
						</div>
					</form>
					<p class="raisely-login__reset">
						<a href="/reset">Forgot your password?</a>
					</p>
				</div>

				<LoginForm requestAdminToken {...props} />
			</div>
		);
	};
};
