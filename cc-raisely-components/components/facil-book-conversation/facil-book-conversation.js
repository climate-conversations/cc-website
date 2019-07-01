/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const CustomForm = RaiselyComponents.import('custom-form');
	const UserSelect = RaiselyComponents.import('user-select');

	const { api } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { dayjs, get } = RaiselyComponents.Common;

	// eslint-disable-next-line object-curly-newline
	const rsvpToItem = (({ uuid, type, userUuid, user }) => ({
		uuid,
		userUuid,
		type,
		firstName: user.firstName,
		lastName: user.lastName,
		fullName: user.fullName,
		prefName: user.prefName,
		email: user.email,
	}));

	class ConversationTeam extends React.Component {
		componentDidMount() {
			this.prepareRsvps();
		}

		prepareRsvps() {
			const defaultRsvps = ['host', 'facilitator', 'co-facilitator', 'observer', 'mentor'];
			// Permit facilitator to add more of these
			const additionalRsvps = ['co-host', 'co-facilitator', 'observer'];

			const initialRsvps = [...this.props.eventRsvps];

			const rsvps = defaultRsvps.map((rsvpType) => {
				const rsvp = { type: rsvpType };
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

			const adminLink = `https://admin.raisely.com/people/${rsvp.userUuid}`;

			if (rsvp.userUuid) {
				const name = rsvp.fullName || `${rsvp.firstName} ${rsvp.lastName}`;

				return (
					<div className="conversation-team__selected_user">
						<span>{name}</span>
						<Button type="button" onClick={() => this.updateRsvp({})}>Change</Button>
						<Button href={adminLink} target="raisely">Raisely</Button>
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
			// eslint-disable-next-line object-curly-newline
			const { save, back, global, eventRsvps } = this.props;
			const nextText = this.props.actionText || 'Next';

			return (
				<div className="conversation-team">
					<div className="conversation-team__title">
						<h3>Volunteers Involved</h3>
						<p>
							Enter the details of all the people involved. You can come back and add more later.
						</p>
						<p>
							If the host is an organisation, enter the name of the contact person
							then edit that person in Raisely and make sure {"they're"} associated with
							the organisation.
						</p>
					</div>
					{eventRsvps.map(this.renderRsvp)}
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
		oldName = '';

		generateForm() {
			const fields = [
				'event.startAt',
				{ sourceFieldId: 'name', help: 'Leave blank to name after host' },
				'event.status',
				'event.processAt', 'event.address1', 'event.address2',
				'event.city', 'event.state', 'event.postcode'];

			const multiFormConfig = [
				{ title: 'Conversation Details', fields },
				{ title: 'People Involved', component: ConversationTeam },
			];

			return multiFormConfig;
		}

		/**
		 * Load eventRsvps in the form
		 * {
		 *	  uuid, userUuid, type, user: { firstName, prefName },
		 *	}
		 *
		 */
		load = async ({ dataToForm }) => {
			const eventUuid = this.props.eventUuid || this.props.router.match.params.event;

			if (!eventUuid) return {};

			// Load event and rsvps
			const [{ event }, eventRsvps] = await Promise.all([
				api.quickLoad({ props: this.props, models: ['event'], required: true }),
				this.loadRsvps(eventUuid),
			]);

			this.oldName = event.name;
			this.setState({ eventRsvps });

			return dataToForm({ event });

			// FIXME: Default city to Singapore (set in admin)
		}

		async loadRsvps(eventUuid) {
			const rsvps = await api.eventRsvps.getAll({ query: eventUuid });
			return rsvps
				.filter(({ type }) => type !== 'guest');
			// eslint-disable-next-line object-curly-newline
			// .map(({ uuid, userUuid, type, user }) => ({
			// 	uuid,
			// 	userUuid,
			// 	type,
			// 	user: pick(user, userAttributes),
			// }));
		}

		save = async (values, formToData) => {
			const data = formToData(values);
			const record = await upsert('events', { data: data.event });

			// Refresh rsvps in case they've changed while the form was open
			const oldRsvps = await this.loadRsvps(record.uuid);
			const newRsvps = values[1].rsvps;

			const toInsert = [];
			const toDelete = [];

			newRsvps.forEach(rsvp => rsvp.uuid || toInsert.push(rsvp));
			oldRsvps.forEach((rsvp) => {
				if (!newRsvps.find(({ uuid }) => rsvp.uuid === uuid)) {
					toDelete.push(rsvp);
				}
			});

			const promises = toInsert.map(rsvp => api.eventRsvps.crate({ data: rsvp }));
			promises.push(...toDelete.map(rsvp => api.eventRsvps.delete({ id: rsvp.uuid })));

			return Promise.all(promises);
		}

		updateStep(step, values, formToData, dataToForm) {
			const data = formToData(values);

			if (step === 1) {
				// Save the form as we go
				this.save().catch(e => console.error(e));
			}

			if (data.event.name === this.oldName) {
				const date = dayjs(data.event.startAt).format('YYYY-MM-DD');
				const host = get(values, '[1].rsvps', []).find(rsvp => rsvp.type === 'host');
				const facil = get(values, '[1].rsvps', []).find(rsvp => rsvp.type === 'facilitator');
				const hostName = host.name;
				const facilName = facil.name;

				data.event.name = `${date} - ${hostName} / ${facilName}`;

				this.oldName = data.event.name;

				const newValues = Object.assign({}, values, dataToForm(data));

				return newValues;
			}

			return null;
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
