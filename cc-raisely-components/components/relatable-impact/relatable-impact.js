/**
  * Relatable Impact
  * Creates a HTML block in which the relative impact can be
  * displayed.
  * Permitted subsitutions are:
  * {carHours} - Equivalent hours of cars driven
  * {treeFields} - Equivalent number of tree fields
  * {monthlyKWH} - green kWh per month
  * {annualKWN} - green kWh per year
  * {peopleSwitched} - green kWh per year
  * {name} - name of the profile
  *
  * @field {html} html The text to display
  * @field {text} profile campaign,page,user
  */
// eslint-disable-next-line no-unused-expressions
(RaiselyComponents, React) => {
	const validDisplay = ['user', 'page', 'campaign'];

	const defaultHtml = '{name} has switched {annualKWH} equiavelent to {treeFields} fields of trees or taking a car off the road for {carHours}';

	const { api } = RaiselyComponents;

	function renderText(text, impacts) {
		// For each impact, create a regexp to do a global replace
		// for {key} in the text, and replace it in the text
		const finalText = Object.keys(impacts).reduce((line, key) => {
			const re = new RegExp(`\\{${key}\\}`, 'g');
			return line.replace(re, impacts[key]);
		}, text);

		return finalText;
	}

	function formatNumbers(impacts) {
		const decimalPlaces = {
			trees: 2,
			minSaving: 0,
			maxSaving: 0,
			maxNewBill: 0,
			totalKWH: 0,
			carHours: 0,
		};

		const result = {};
		Object.keys(impacts).forEach((key) => {
			result[key] = impacts[key].toLocaleString(undefined, {
				maximumFractionDigits: decimalPlaces[key] || 0,
			});
		});
		return result;
	}

	function calculateImpact(campaign, profile) {
		if (!campaign.public.comparisons) {
			throw new Error('Configuration issue: campaign.public.comparisons is missing');
		}

		const { treeFieldsPerKWH, carHoursPerKWH } = campaign.public.comparisons;

		// Activity is stored in kWh / month, convert to year
		const monthlyKWH = profile.exerciseTotal || 0;
		const annualKWH = profile.exerciseTotal * 12;
		const treeFields = annualKWH * treeFieldsPerKWH;
		const carHours = annualKWH * carHoursPerKWH;

		return formatNumbers({
			annualKWH,
			carHours,
			treeFields,
			monthlyKWH,
		});
	}

	/**
	 * Once you've declared your required components, be sure to return the function
	 * representing your final Raisely Component so it can be shown on your page.
	 */
	return class RelatableImpact extends React.Component {
		state = {
			switched: null,
		}

		componentDidMount() {
			// when this component first loads, let's perform the call
			this.fetchPeopleSwitched();
		}

		displayType() {
			const values = this.props.getValues();
			const { profile } = values;

			return (validDisplay.includes(profile)) ? profile : 'campaign';
		}

		selectProfile() {
			const select = this.displayType();

			if (select === 'page') {
				const { profile } = this.props.global.current;
 				return profile || {};
			}

			if (select === 'user') {
				const { profile } = this.props.global.user;
				return profile || {};
			}

			return this.props.global.campaign.profile;
		}

		async fetchPeopleSwitched() {
			const values = this.props.getValues();

			const displayType = this.displayType();

			const hasFetched = this.state.switched || this.state.switched === 0;

			// Only fetch people switched if we need it and don't already have it
			if (hasFetched || !values.html.includes('peopleSwitched')) return;

			const profile = this.selectProfile();

			let result;

			// Group page = all descendents of the group (individual)
			// Individual page = all the children of the profile (individual)
			// Campaign = all individual profiles
			const query = {
				type: 'INDIVIDUAL',
				'public.switchOnConfirmed': 'yes',
			};

			if (displayType === 'campaign') {
				result = await api.profiles.getAll({
					query,
				});
			} else {
				result = await api.profiles.members.getAll({
					id: profile.uuid,
					query,
				});
			}

			const switched = result.body().data().pagination.total;

			// bind the payload result to this component
			this.setState({ switched });
		}

		render() {
			/**
			 * If you declare fields within your Custom Component settings, they can be accessed
			 * by calling props.getValues() if set within your page editor. If values aren't set
			 * while editing, they will not be present on the values object.
			 */
			const values = this.props.getValues();

			const html = values.html || defaultHtml;

			const { campaign } = this.props.global;

			const profile = this.selectProfile();

			// This prevents null or something equally unsightly appearing
			// while the value is still being loaded
			const loaded = this.state.switched || this.state.switched === 0;

			// Useful during editing when the user changes the text
			// to include the number of people switched
			if (!loaded) this.fetchPeopleSwitched();

			const peopleSwitched = loaded ? this.state.switched : '';

			const replacements = Object.assign({
				name: profile.name,
				peopleSwitched,
			}, calculateImpact(campaign, profile));

			const htmlOut = renderText(html, replacements);

			/* eslint-disable react/no-danger */
			return (
				<div dangerouslySetInnerHTML={{ __html: htmlOut }} />
			);
		}
	};
};
