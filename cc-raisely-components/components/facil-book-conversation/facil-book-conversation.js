/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const CustomForm = RaiselyComponents.import('custom-form');
	const UserSelect = RaiselyComponents.import('user-select');

	const { api } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;

	const rsvpToItem = ({uuid, type, userUuid, user}) => ({
		uuid,
		userUuid,
		type,
		firstName: user.firstName,
		lastName: user.lastName,
		fullName: user.fullName,
		email: user.email,
	});

	class ConversationTeam extends React.Component {
		componentDidMount() {
			this.prepareRsvps();
		}

		prepareRsvps() {
			const defaultRsvps = ['host', 'facilitator', 'co-facilitator', 'observer', 'mentor'];
			const additionalRsvps = ['co-host', 'co-facilitator', 'observer'];


			const initialRsvps = [...this.props.eventRsvps];

			const rsvps = defaultRsvps.map((rsvpType) => {
				const rsvp = { type: rsvpType }
				const person = initialRsvps.find(r => r.type === rsvp);
				if (person) {
					Object.assign(rsvp, rsvpToItem(person));
				}
				return person;
			});

			initialRsvps.forEach((rsvp) => {
				if (!rsvps.find(r => r.uuid === rsvp.uuid)) {
					rsvps.push(rsvpToItem(rsvp));
				}
			});

			this.setState({ rsvps });
		}

		next = async () => {
			console.log('ConversationTeam.next');
			const { save } = this.props;
			if (save) {
				this.setState({ saving: true });
				try {
					await save();
				} catch (e) {
					// Save function handles the error, we just need
					// to avoid advancing the form
					return;
				} finally {
					this.setState({ saving: false });
				}
			}
			this.props.next();
		}

		updateRsvp = (user, userUuid, index) => {
			const { pageIndex } = this.props;

			const rsvpType = this.state.rsvps[index].type;
			const newRsvps = [...this.state.rsvps]

			newRsvps[index] = rsvpToItem({ user, userUuid, type: rsvpType });
			this.setState({ rsvps: newRsvps });
			this.props.updateValues({ [pageIndex]: this.state.rsvps });
		}

		renderRsvp = (rsvp, index) => {
			const { global } = this.props;

			if (rsvp.userUuid) {
				const name = rsvp.fullName || `${rsvp.firstName} ${rsvp.lastName}`;

				return (
					<div className="conversation-team__selected_user">
						<span>{name}</span>
						<Button type="button" onClick={() => updateRsvp({})}>Change</Button>
					</div>
				);
			}

			return (
				<div className="conversation-team__user-select">
					<UserSelect
						api={api}
						global={global}
						update={(user, userUuid) => this.updateRsvp(user, userUuid, index)}
					/>
				</div>
			);
		}

		render() {
			const { save, back, global } = this.props;
			const nextText = this.props.actionText || 'Next';

			return (
				<div className="conversation-team">
					{rsvps.map(this.renderRsvp);
					<div className="conversation-team__add-more">
						<Button>Add More Team Members</Button>
					</div>
					<div className="conversation-team__navigation custom-form__navigation">
						<Button
							type="button"
							disabled={this.state.saving}
							onClick={back}
						>
							Back
						</Button>
						<Button
							type="button"
							onClick={this.next}
							disabled={this.state.saving}
						>
							{this.state.saving ? 'Saving...' : nextText}
						</Button>
					</div>
				</div>
			);
		}
	}

	return class FacilBookConversation extends React.Component {
		generateForm() {
			const fields = ['event.startAt', 'event.processAt', 'event.address1', 'event.address2',
				'event.city', 'event.state', 'event.postcode'];

			const multiFormConfig = [
				{ title: 'Conversation Details', fields },
				{ title: 'People Involved', component: ConversationTeam },
			];

			return multiFormConfig;
		}

		load = async () => {
			// Load event data
			// Load eventRsvps in the form
			// {
			//	uuid, userUuid, type, user: { firstName, prefName },
			// }
			// Filter out guest rsvps
			// Default city to Singapore (set in admin)
		}

		save = async () => {

		}

		updateStep(step, values, formToData) {
			const data = formToData(values);

			// FIXME extract
			data.event.name = `${data.event.startAt} ${data.event.host}`;

			// Upsert event
			// Calculate difference in RSVPs
			// Add new rsvps
			// Delete old rsvps (careful not remove guests)
		}

		render() {
			const steps = this.generateForm();
			return (<CustomForm
				steps={steps}
				controller={this}
				eventRsvps={this.state.eventRsvps}
				onRsvpChange
			/>);
		}
	};
};
