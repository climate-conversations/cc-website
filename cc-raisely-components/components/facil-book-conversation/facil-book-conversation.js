/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {

	const { api } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { get } = RaiselyComponents.Common;
	const { getData, getQuery } = api;

	const CustomForm = RaiselyComponents.import('custom-form');
	const UserSelect = RaiselyComponents.import('user-select');
	const RaiselyButton = RaiselyComponents.import('raiely-button');
	const UserSaveHelperRef = RaiselyComponents.import('cc-user-save', { asRaw: true });
	const ConversationRef = RaiselyComponents.import('conversation', { asRaw: true });
	let UserSaveHelper;
	let Conversation;

	// eslint-disable-next-line object-curly-newline
	const rsvpToItem = (rsvp => {
		const { uuid, type, userUuid, user } = rsvp;

		return {
			uuid,
			userUuid,
			type,
			firstName: user.firstName,
			lastName: user.lastName,
			fullName: user.fullName,
			prefName: user.prefName,
			email: user.email,
		};
	});

	class ConversationTeam extends React.Component {
		state = { saving: false, rsvps: [] };

		componentDidMount() {
			this.prepareRsvps();
		}

		prepareRsvps() {
			const defaultRsvps = ['host', 'facilitator', 'co-facilitator', 'observer', 'mentor'];
			// Permit facilitator to add more of these
			const additionalRsvps = ['co-host', 'co-facilitator', 'observer'];

			const initialRsvps = [...this.props.rsvps];

			const rsvps = defaultRsvps.map((rsvpType) => {
				const rsvp = { type: rsvpType };
				const person = initialRsvps.find(r => r.type === rsvpType);
				if (person) {
					Object.assign(rsvp, rsvpToItem(person));
				}
				return rsvp;
			});
			initialRsvps.forEach((rsvp) => {
				if (rsvp.uuid && !rsvps.find(r => r.uuid === rsvp.uuid)) {
					rsvps.push(rsvpToItem(rsvp));
				}
			});

			// Get any state from going back and forward on the form
			const existingState = this.props.values[this.props.step];

			// Assign any rsvps currently in the state
			Object.assign(rsvps, existingState);

			this.setState({ rsvps });
		}

		next = async () => {
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
			console.log('updateRsvp called', user, userUuid, index);
			const { pageIndex } = this.props;

			const rsvpType = this.state.rsvps[index].type;
			const newRsvps = [...this.state.rsvps];

			newRsvps[index] = rsvpToItem({ user, userUuid, type: rsvpType });
			this.setState({ rsvps: newRsvps }, () => {
				this.props.updateValues({ [pageIndex]: this.state.rsvps });
			});
		}

		renderRsvp = (rsvp, index) => {
			const { global } = this.props;
			const label = rsvp && rsvp.type;

			if (rsvp && rsvp.userUuid) {
				const name = rsvp.fullName || `${rsvp.firstName} ${rsvp.lastName}`;

				return (
					<div className="conversation-team__selected_user field-wrapper">
						<label htmlFor={label}>
							<span className="form-field__label-text">{label}</span>
						</label>
						<div className="user__card">
							<div className="static-field__title">{name}</div>
							<div className="static-field__subtitle">{rsvp.email}</div>
							<Button type="button" onClick={() => this.updateRsvp({})}>Change</Button>
							<RaiselyButton uuid={rsvp.userUuid} recordType="people" />
						</div>
					</div>
				);
			}

			return (
				<div className="conversation-team__user-select field-wrapper">
					<UserSelect
						api={api}
						global={global}
						update={({ user, userUuid }) => this.updateRsvp(user, userUuid, index)}
						label={label}
					/>
				</div>
			);
		}

		render() {
			// eslint-disable-next-line object-curly-newline
			const { back } = this.props;
			const { rsvps } = this.state;
			const nextText = this.props.actionText || 'Next';

			return (
				<div className="custom-form__step">
					<div className="conversation-team custom-form__step-header">
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
					</div>
					<div className="custom-form__step-form">
						{rsvps.map(this.renderRsvp)}
						{/* <div className="conversation-team__add-more">
							<Button>Add More Team Members</Button>
						</div> */}
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
				</div>
			);
		}
	}

	return class FacilBookConversation extends React.Component {
		state = { rsvps: [] };
		oldName = '';

		generateForm() {
			const fields = [
				'event.startAt',
				'event.conversationType',
				{ sourceFieldId: 'event.name', help: 'Leave blank to name after host' },
				'event.status',
				'event.processAt', 'event.address1', 'event.address2',
				'event.suburb', 'event.country', 'event.postcode'];

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
			if (!Conversation) Conversation = ConversationRef().html;
			const query = getQuery(get(this.props, 'router.location.search'));
			const eventUuid = this.props.eventUuid ||
				get(this.props, 'match.params.event') ||
				get(this.props, 'match.params.conversation') ||
				query.event;

			let addHost;
			let rsvps = [];
			if (query.host) {
				addHost = query.host && await this.loadHost(query.host);
				if (!addHost) {
					console.error('Host could not be found: ', query.host);
				} else {
					rsvps.push(addHost);
					this.setState({ rsvps });
				}
			}

			// We must be creating a new conversation
			if (!eventUuid) {
				// Set the current user as the facil
				const facilitator = get(this.props, 'global.user');
				const facilitatorRsvp = { type: 'facilitator', userUuid: facilitator.uuid, user: facilitator };
				rsvps.push(facilitatorRsvp);
				console.log('new conv: rsvps', rsvps)
				this.setState({ rsvps });
				return {};
			}

			// Load event and rsvps
			let event;
			([event, rsvps] = await Promise.all([
				Conversation.loadConversation({ props: this.props, required: true }),
				this.loadRsvps(eventUuid),
			]));

			this.oldName = event.name;
			if (addHost) rsvps.push(addHost);
			this.setState({ rsvps, event });

			return dataToForm({ event });
		}

		async loadHost(userUuid) {
			const user = await getData(api.users.get({ id: userUuid }));
			const newHostRsvp = { type: 'host', userUuid, user };
			return newHostRsvp;
		}

		async loadRsvps(eventUuid) {
			if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;
			const rsvps = await UserSaveHelper.proxy(`/events/${eventUuid}/rsvps?private=1`);
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
			// Save the campaign uuid
			if (!data.event) data.event = {};
			data.event.campaignUuid = this.props.global.campaign.uuid;
			console.log('saving event', data.event);

			let newEvent = !this.state.event;
			if (!newEvent) {
				data.event.uuid = this.state.event.uuid;
			}

			if (!data.event.name) {
				const rsvps = Object.keys(values[1] || {}).map(key => values[1][key]);
				const hosts = rsvps.filter(rsvp => rsvp.email && rsvp.type === 'host')
				if (hosts.length) {
					if (!Conversation) Conversation = ConversationRef().html;
					data.event.name = Conversation.defaultName(hosts);
				}
			}


			// workaround broken save
			let record;
			if (!UserSaveHelper) UserSaveHelper = UserSaveHelperRef().html;
			if (!data.event.uuid) {
				newEvent = true;
				record = await UserSaveHelper.proxy(`/events`, {
					method: 'POST',
					body: {
						data: data.event,
					},
				});
			} else {
				const event = { ...data.event };
				delete event.uuid;
				record = await UserSaveHelper.proxy(`/events/${data.event.uuid}`, {
					method: 'PATCH',
					body: {
						partial: true,
						data: event,
					},
				});
			}

			this.setState({ event: record });

			// If we're doing a save between steps, don't save RSVPs as they won't exist
			if (!values[1]) return null;

			const promises = [];
			const toInsert = [];
			const newRsvps = [];
			Object.keys(values[1]).forEach((key) => { newRsvps[key] = values[1][key]; });

			if (newEvent) {
				// newRsvps is an object. convert to array
				Object.keys(newRsvps).forEach((key) => {
					const rsvp = newRsvps[key];
					if (rsvp.userUuid) {
						rsvp.eventUuid = record.uuid;
						toInsert.push(rsvp);
					}
				});
			} else {
				// Refresh rsvps in case they've changed while the form was open
				const oldRsvps = await this.loadRsvps(record.uuid);
				const toDelete = [];

				// If an rsvp has a user assigned, and doesn't have a uuid (ie is new)
				// assign the event uuid and save it
				newRsvps.forEach((rsvp) => {
					if (!rsvp.uuid && rsvp.userUuid) {
						rsvp.eventUuid = record.uuid;
						toInsert.push(rsvp);
					}
				});

				// If we can't find an old rsvp, it's been removed, so delete it
				oldRsvps.forEach((rsvp) => {
					if (!newRsvps.find(({ uuid }) => rsvp.uuid === uuid)) {
						toDelete.push(rsvp);
					}
				});
				promises.push(...toDelete.map(rsvp => UserSaveHelper.proxy(`/event_rsvps/${rsvp.uuid}`, { method: 'DELETE' })));
			}

			promises.push(toInsert.map(rsvp => UserSaveHelper.proxy(`/event_rsvps`, { method: 'POST', body: { data: rsvp } })));


			return Promise.all(promises);
		}

		updateStep = (step, values, formToData, dataToForm) => {
			const data = formToData(values);

			if (step === 1) {
				// Save the form as we go
				this.save(values, formToData).catch(e => console.error(e));
			}

			return null;
		}

		render() {
			const steps = this.generateForm();

			return (<CustomForm
				{...this.props}
				steps={steps}
				controller={this}
				rsvps={this.state.rsvps}
				onRsvpChange
				redirectToReturnTo="true"
			/>);
		}
	};
};
