/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const CustomForm = RaiselyComponents.import('custom-form');
	const { api } = RaiselyComponents;

	return class FacilReflection extends React.Component {
		generateForm() {
			const multiFormConfig = [
				{ title: 'Facilitator Reflection', interactionCategory: 'facil-reflection', exclude: ['conversationUuid'] },
			];

			return multiFormConfig;
		}

		load = async ({ dataToForm }) => {
			const eventUuid = this.props.eventUuid || this.props.router.match.params.event;

			const query = {
				record: eventUuid,
				recordType: 'event',
				category: 'facil-reflection',
				userUuid: this.props.globals.user.uuid,
			};

			let interaction;

			if (eventUuid) {
				interaction = query;
			} else {
				// Load event and rsvps
				interaction = await api.interactions.get({
					query,
				});
			}

			return dataToForm({ interaction });
		}

		async save(values, formToData) {
			const data = formToData(values);

			return api.upsert('events', { data: data.interactions['facil-reflection'] });
		}

		render() {
			const config = this.generateForm();
			return (<CustomForm
				steps={config}
				controller={this}
				followNextQuery="1"
			/>
			);
		}
	};
};
