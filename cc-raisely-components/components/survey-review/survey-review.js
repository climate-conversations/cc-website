(RaiselyComponents, React) => {
	const { api, Common, Spinner } = RaiselyComponents;
	const { getData } = api;
	const { get } = Common;
	const { Link } = RaiselyComponents;

	const DisplayRecord = RaiselyComponents.import('display-record');
	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	let Conversation;

	return class SurveyReview extends React.Component {
		state = { loading: true };
		componentDidMount() {
			this.load();
		}
		componentDidUpdate() {
			const eventRsvpUuid = get(this.props, 'match.params.eventRsvp');
			if (eventRsvpUuid !== this.state.eventRsvpUuid) {
				this.load();
			}
		}

		getFields() {
			if (!Conversation) Conversation = ConversationRef().html;
			const preSurveyQuestions = [
				'user.nycConsent',
				{ interactionCategory: Conversation.surveyCategories().preSurvey },
				'user.dateOfBirth',
				{
					sourceFieldId: 'user.residency',
					type: 'select',
					options: [{"label": "Singapore Citizen", "value": "citizen"}, {"label": "Permanent Resident", "value": "permanent resident"}, {"label": "Employment Pass", "value": "employment pass"},{"label": "Other", "value": "Other"}],
				},
				'user.ethnicity',
				'user.gender',
			];
			// Show all questions in the post survey
			const postSurveyQuestions = [{
				interactionCategory: Conversation.surveyCategories().postSurvey,
				exclude: ['research', 'fundraise', 'host', 'volunteer', 'hostCorporate', 'facilitate'],
			}];

			const guestAction = [
				'user.fullName',
				'user.preferredName',
				{ sourceFieldId: 'user.email', required: false },
				'user.phoneNumber', 'user.postcode',
				{
					interactionCategory: Conversation.surveyCategories().postSurvey,
					include: ['host', 'facilitate', 'volunteer', 'hostCorporate', 'research', 'fundraise'],
				},
			];

			return [
				{ id: 'preHeader', type: 'rich-description', default: 'Pre-Survey Questions' },
				...preSurveyQuestions,
				{ id: 'postHeader', type: 'rich-description', default: 'Post-Survey Questions' },
				...postSurveyQuestions,
				{ id: 'cta', type: 'rich-description', default: 'CTA' },
				...guestAction,
				'event_rsvp.donationIntention',
				'event_rsvp.donationAmount',
			];
		}

		async load() {
			try {
				if (!Conversation) Conversation =  ConversationRef().html;
				const eventRsvpUuid = get(this.props, 'match.params.eventRsvp');
				this.setState({ eventRsvpUuid });
				const eventRsvp = await Conversation.loadRsvp({ props: this.props, required: true, private: true });

				console.log('Event rsvp', eventRsvp)
				const [user, { pre, post }] = await Promise.all([
					getData(api.users.get({ id: eventRsvp.userUuid, query: { private: 1 } })),
					Conversation.loadSurveys(eventRsvp),
				]);
				this.setState({
					loading: false,
					values: {
						event_rsvp: eventRsvp,
						interaction: {
							'cc-pre-survey-2020': pre,
							'cc-post-survey-2020': post,
						},
						user,
					},
				});
			} catch (e) {
				console.error(e);
				this.setState({ loading: false, error: e.message || 'An unknown error occurred' });
			}
		}

		renderInner() {
			const { loading, error, values } = this.state;
			if (error) {
				return <p className="error">{error}</p>;
			}
			if (loading) return <Spinner />;
			return (
				<DisplayRecord {...this.props} values={values} fields={this.getFields()} />
			);
		}

		render() {
			const name = get(this.state, 'values.user.fullName') ||
				get(this.state, 'values.user.preferredName');
			const eventUuid = get(this.state, 'values.event_rsvp.uuid');
			const suffix = name ? `: ${name}` : '';
			const returnLink = `/conversations/${eventUuid}/view`;
			return (
				<div className="survey-review-wrapper">
					<Link href={returnLink}>Back to Conversation</Link>
					<h3>Review Survey{suffix}</h3>
					{this.renderInner()}
					<Link href={returnLink}>Back to Conversation</Link>
				</div>
			)
		}
	};
};
