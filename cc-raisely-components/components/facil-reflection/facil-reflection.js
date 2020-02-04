/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const CustomForm = RaiselyComponents.import('custom-form');
	const { api } = RaiselyComponents;
	const { get, pick } = RaiselyComponents.Common;
	const { getData, save } = api;

	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	let Conversation;
	// const interactionCategory = 'facilitator-reflection';

	return class FacilReflection extends React.Component {
		generateForm() {
			if (!Conversation) Conversation = ConversationRef().html;
			const multiFormConfig = [
				{
					title: 'Facilitator Reflection',
					fields: [{ interactionCategory: Conversation.getReflectionCategory(), exclude: ['conversationUuid'] }],
				},
			];

			return multiFormConfig;
		}

		load = async ({ dataToForm }) => {
			const eventUuid = this.props.eventUuid || get(this.props, 'match.params.event');
			const userUuid = get(this.props, 'global.user.uuid');

			if (!Conversation) Conversation = ConversationRef().html;
			const interactions = await Conversation.loadReflections({ eventUuid, userUuid });

			let [interaction] = interactions;
			if (!interaction) {
				interaction = {
					recordUuid: eventUuid,
					recordType: 'event',
					categoryUuid: Conversation.getReflectionCategory(),
					userUuid: userUuid,
				}
			}

			this.setState({ interaction, interactionCategory: Conversation.getReflectionCategory() });

			return dataToForm({ interaction: { [Conversation.getReflectionCategory()]: interaction } });
		}

		save = async (values, formToData) => {
			const { interactionCategory } = this.state;
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
