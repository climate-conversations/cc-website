/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const CustomForm = RaiselyComponents.import('custom-form');
	const { api } = RaiselyComponents;
	const { get, pick } = RaiselyComponents.Common;
	const { getData, save } = api;

	const interactionCategory = 'facilitator-reflection';

	return class FacilReflection extends React.Component {
		generateForm() {
			const multiFormConfig = [
				{
					title: 'Facilitator Reflection',
					fields: [{ interactionCategory, exclude: ['conversationUuid'] }],
				},
			];

			return multiFormConfig;
		}

		load = async ({ dataToForm }) => {
			const eventUuid = this.props.eventUuid || get(this.props, 'match.params.event');

			const query = {
				record: eventUuid,
				recordType: 'event',
				category: interactionCategory,
				user: get(this.props, 'global.user.uuid'),
				private: 1,
			};

			const interactions = await getData(api.interactions.getAll({
				query,
			}));
			let [interaction] = interactions;
			if (!interaction) {
				interaction = query;
				interaction.categoryUuid = interaction.category;
				interaction.userUuid = interaction.user;
				interaction.recordUuid = interaction.record;
				delete interaction.category;
				delete interaction.user;
				delete interaction.record;
				delete interaction.private;
			}

			this.setState({ interaction });

			return dataToForm({ interaction: { [interactionCategory]: interaction } });
		}

		save = async (values, formToData) => {
			const data = formToData(values);
			const interaction = data.interaction[interactionCategory];
			console.log('Saving...' ,values, data);
			interaction.detail.readOnly = false;
			Object.assign(interaction, pick(this.state.interaction, ['categoryUuid', 'recordUuid', 'userUuid', 'recordType']));
			await getData(save('interactions', interaction, { partial: true }));
		}

		render() {
			const config = this.generateForm();
			return (<CustomForm
				{...this.props}
				steps={config}
				controller={this}
				followNextQuery="1"
				redirectToReturnTo="true"
			/>);
		}
	};
};
