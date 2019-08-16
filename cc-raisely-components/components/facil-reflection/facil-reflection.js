/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const CustomForm = RaiselyComponents.import('custom-form');
	const { api } = RaiselyComponents;
	const { get } = RaiselyComponents.Common;

	return class FacilReflection extends React.Component {
		generateForm() {
			const multiFormConfig = [
				{ title: 'Facilitator Reflection', interactionCategory: 'facil-reflection', exclude: ['conversationUuid'] },
			];

			return multiFormConfig;
		}

		load = async ({ dataToForm }) => {
			return;
			const eventUuid = this.props.eventUuid || get(this.props, 'location.router.match.params.event');

			const query = {
				record: eventUuid,
				recordType: 'event',
				category: 'facil-reflection',
				user: get(this.props, 'globals.user.uuid'),
			};

			let interaction;

			interaction = await api.interactions.get({
				query,
			});
			if (!interaction) {
				interaction = query;
				interaction.categoryUuid = interaction.category;
				interaction.userUuid = interaction.user;
				delete interaction.category;
				delete interaction.user;
			}

			return dataToForm({ interaction });
		}

		async save(values, formToData) {
			const data = formToData(values);
			return api.upsert('interactions', { data: data.interactions['facil-reflection'] });
		}

		render() {
			const config = this.generateForm();
			return (<CustomForm
				{...this.props}
				steps={config}
				controller={this}
				followNextQuery="1"
			/>);
		}
	};
};
