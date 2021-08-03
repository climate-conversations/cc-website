/**
  * Custom Profile Editor
  * For displaying a limit set of fields to edit
  *
  * Define the following fields for the custom component
  *
  * @field {text} fields Comma separated list of field ids to show
  * @field {text} redirect Path to redirect to on successful form submission
  * @field {text} buttonLabel Label for the submit button
  */

// eslint-disable-next-line no-unused-expressions
(RaiselyComponents, React) => {
	const { Form } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;

	const defaults = {
		buttonLabel: 'Save',
	};

	/**
	 * Custom Profile Edit Form molecule
	 */
	return class CustomProfileEditForm extends React.Component {
		static description = 'The edit form for a profile';

		state = {
			values: this.props.getFormValues({
				fields: 'profile', from: this.props.profile || 'current',
			}),
		}

		action = async (formData, options) => {
			const { integrations } = this.props;
			// update user details
			try {
				const data = this.props.processFormData(formData);

				const request = await this.props.api.profiles.update({
					id: this.props.global.user.profile.uuid,
					data: { data },
				});
				this.props.actions.addUserProfile(request.body().data().data);
				this.props.actions.addMessage('Profile updated succesfully');
				integrations.broadcast('profile.updated', { user: this.props.global.user, profile: request.body().data().data });
				options.setSubmitting(false);

				if (this.redirect) this.props.history.push(this.redirect);
			} catch (e) {
				options.setSubmitting(false);
				this.props.actions.addErrorMessage(e);
			}
		}

		// eslint-disable-next-line class-methods-use-this
		calculateImpact(campaign, dwellingSize, pax, months) {
			if (!campaign.public) return {};

			const dwellings = campaign.public.householdAverages;
			const monthlyKWH = (dwellings[dwellingSize] || dwellings.hdb3) * pax;
			const totalKWH = monthlyKWH * months;

			const trees = campaign.public.treeFieldsPerKWH * totalKWH;

			// FIXME calculate this
			const spMonthly = 50;
			const greenMonthlyMin = 48;
			const greenMonthlyMax = 49;

			return {
				monthlyKWH,
				trees,
				totalKWH,
				minSaving: (spMonthly - greenMonthlyMax) * months,
				maxSaving: (spMonthly - greenMonthlyMin) * months,
				maxNewBill: greenMonthlyMax * months,
			};
		}

		render() {
			const values = this.props.getValues();

			if (!this.props.global.user) {
				return (
					<div>
						<h5>Oops!</h5>
						<p>Sorry, {"we're"} not sure who you are.</p>
						<p>Try clicking a link from an email {"we've"} sent you.</p>
						<Button
							href="/reset">
							Send me a new link!
						</Button>
					</div>
				);
			}

			Object.keys(values)
				.forEach((key) => { if (values[key] === null) values[key] = defaults[key]; });

			const { global } = this.props;

			this.redirectTo = values.redirect;

			// FIXME these need to be dynamic
			const friendDwellingSize = 'hdb3';
			const goal = 5;

			const {
				trees,
				minSaving,
				maxSaving,
				maxNewBill,
				totalKWH,
			} = this.calculateImpact(friendDwellingSize, goal, 12);

			// Split fields by comma, remove any fields that are empty string
			const fieldsToShow = (values.fields || '').split(',').map(f => f.trim()).filter(f => f);

			// Show only selected fields
			const fields = global.customFields.profile
				.filter(f => fieldsToShow.includes(f.id));

			return (
				<React.Fragment>
					<div className="goal-form">
						{fields.length ? '' : 'Please specify some fields to show'}
						<Form
							fields={fields}
							values={values}
							global={global}
							actionText={values.buttonLabel}
							action={this.action}
						/>
					</div>
					<div className="goal-calculator">
						<p><strong>FIXME these numbers are placeholders</strong></p>
						<p>
							Swiching {goal} friends would add up to {totalKWH} kWh of electricity
							per year being purchased from green energy retailers.
						</p>
						<p>
							{"That's"} rougly the equivalent of planting {trees} football fields
							of rainforest.
						</p>
						<p>
							Based on the average electricity utility bill, your friends could
							save between ${minSaving} and ${maxSaving} per year on their bill*,
							and up to ${maxNewBill} per year would flow towards investments in
							a clean &amp; green energy system.
						</p>
						<p className="small">
							* This is not financial advice. Pricing may vary for different customers
							based on usage, and with changes to available plans and offers by retailers.
							You and your friends should check the costs of any choices before making a
							decision to switch.
						</p>
					</div>
				</React.Fragment>
			);
		}
	};
};
