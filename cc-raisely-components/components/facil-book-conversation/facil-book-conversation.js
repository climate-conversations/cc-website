/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const CustomForm = RaiselyComponents.import('custom-form');
	const UserSelect = RaiselyComponents.import('user-select');
	const RaiselyButton = RaiselyComponents.import('raiely-button');

	const { api } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { dayjs, get } = RaiselyComponents.Common;
	const { getQuery, save } = api;

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

	async function doApi(promise) {
		const response = await promise;
		const status = response.statusCode();
		if (status >= 400) {
			const message = get(response.body(), 'errors[0].message', 'An unknown error has occurred');
			console.error(response.body());
			throw new Error(message);
		}
		return response.body().data().data;
	}

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
				const person = initialRsvps.find(r => r.type === rsvp);
				if (person) {
					Object.assign(rsvp, rsvpToItem(person));
				}
				return rsvp;
			});

			initialRsvps.forEach((rsvp) => {
				if (!rsvps.find(r => r.uuid === rsvp.uuid)) {
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
			const eventUuid = this.props.eventUuid ||
				get(this.props, 'match.params.event') ||
				getQuery(get(this.props, 'router.location.search')).event;

			// We must be creating a new conversation
			if (!eventUuid) {
				return {};
			}

			// Load event and rsvps
			const [quickLoads, rsvps] = await Promise.all([
				api.quickLoad({ props: this.props, models: ['event.private'], required: true }),
				this.loadRsvps(eventUuid),
			]);

			const { event } = quickLoads;
			this.oldName = event.name;
			this.setState({ rsvps, event });

			return dataToForm({ event });
		}

		async loadRsvps(eventUuid) {
			const rsvps = await doApi(api.eventRsvps.getAll({ query: { event: eventUuid, private: 1 } }));
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
			data.event.campaignUuid = this.props.global.campaign.uuid;
			console.log('saving event', data.event);

			const newEvent = !this.state.event;
			if (!newEvent) {
				data.event.uuid = this.state.event.uuid;
			}
			// workaround broken save
			let record;
			if (!data.event.uuid) {
				record = await doApi(save('events', data.event, { partial: true }));
			} else {
				const event = { ...data.event };
				delete event.uuid;
				record = await doApi(api.events.update({ id: data.event.uuid, data: { data: event, partial: true } }));
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
				oldRsvps.forEach((rsvp) => {
					if (!newRsvps.find(({ uuid }) => rsvp.uuid === uuid)) {
						toDelete.push(rsvp);
					}
				});
				promises.push(...toDelete.map(rsvp => doApi(api.eventRsvps.delete({ id: rsvp.uuid }))));
			}

			promises.push(toInsert.map(rsvp => doApi(api.eventRsvps.create({ data: rsvp }))));

			return Promise.all(promises);
		}

		updateStep = (step, values, formToData, dataToForm) => {
			const data = formToData(values);

			if (step === 1) {
				// Save the form as we go
				this.save(values, formToData).catch(e => console.error(e));
			}

			if (!data.event.name) {
				const host = get(values, '[1].rsvps', []).find(rsvp => rsvp.type === 'host');

				if (host) {
					const hostName = get(host, 'preferredName', '');
					data.event.name = `${hostName}'s Conversation`;

					const newValues = Object.assign({}, values, dataToForm(data));

					return newValues;
				}
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
