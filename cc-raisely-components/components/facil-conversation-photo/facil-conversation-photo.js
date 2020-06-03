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

	const WEBHOOK_URL = `https://asia-northeast1-climate-conversations-sync.cloudfunctions.net/raiselyPeople`;

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
			await UserSaveHelper.proxy(`/events/${event.uuid}`, {
				method: 'PATCH',
				body: {
					partial: true,
					data: conversation,
				}
			});

			const webhookData = {
				type: 'conversation.photoUploaded',
				data: {
					conversation: event,
					photoConsent: get(event, 'private.photoConsent'),
					url: get(event, 'private.attendeePhotoUrl'),
				}
			};
			console.log('Sending to conversation-sync webhook', webhookData);
			// Send the guest to be added to the backend spreadsheet
			await UserSaveHelper.doFetch(WEBHOOK_URL, {
				method: 'post',
				body: {
					data: webhookData,
				}
			});
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
