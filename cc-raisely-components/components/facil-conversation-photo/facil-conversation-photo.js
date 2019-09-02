/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const CustomForm = RaiselyComponents.import('custom-form');

	const { api } = RaiselyComponents;
	const { getData, save } = api;
	const { get } = RaiselyComponents.Common;

	return class FacilDonationReport extends React.Component {
		generateForm() {
			const multiFormConfig = [
				{ title: 'Upload Conversation Photo', fields: ['event.photoUrl', 'event.photoConsent'] },
			];

			return multiFormConfig;
		}

		load = async ({ dataToForm }) => {
			const records = await api.quickLoad({ props: this.props, required: true, models: ['event.private'] });
			return dataToForm(records);
		}

		async save(values, formToData) {
			const data = formToData(values);
			const { event } = data;
			return getData(save('event', event, { partial: true }));
		}

		render() {
			const config = this.generateForm();
			return (
				<CustomForm
					{...this.props}
					steps={config}
					controller={this}
					redirectToReturnTo="true"
				/>
			);
		}
	};
};
