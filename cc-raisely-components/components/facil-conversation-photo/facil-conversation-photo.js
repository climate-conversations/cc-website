/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const CustomForm = RaiselyComponents.import('custom-form');

	const { api } = RaiselyComponents;
	const { getData, save } = api;
	const { get } = RaiselyComponents.Common;

	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	let Conversation;
	let UserSaveHelper;

	return class ConversationPhoto extends React.Component {
		generateForm() {
			const multiFormConfig = [
				{ title: 'Upload Conversation Photo', fields: ['event.attendeePhotoUrl', 'event.photoConsent'] },
			];

			return multiFormConfig;
		}

		load = async ({ dataToForm }) => {
			if (!Conversation) Conversation = ConversationRef().html;
			const event = await Conversation.loadConversation({ props: this.props, required: true, private: true });
			return dataToForm({ event });
		}

		async save(values, formToData) {
			const data = formToData(values);
			const { event } = data;
			const conversation = { ...event };
			delete conversation.uuid;
			if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;

			await Promise.all([
					UserSaveHelper.proxy(`/events/${event.uuid}`, {
					method: 'PATCH',
					body: {
						partial: true,
						data: conversation,
					}
				}),
				UserSaveHelper.notifySync("conversation.photoUploaded", {
					conversation: event,
					photoConsent: get(event, 'private.photoConsent'),
					url: get(event, 'private.attendeePhotoUrl'),
				}),
			]);
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
