/* eslint-disable class-methods-use-this */
(RaiselyComponents, React) => {
	const CustomForm = RaiselyComponents.import('custom-form');
	const UserSelect = RaiselyComponents.import('user-select');

	const { api } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { get } = RaiselyComponents.Common;
	const { getData, getQuery, save } = api;

	return class FacilAddHost extends React.Component {
		state = {};

		generateForm() {
			const fields = [
				'user.preferredName',
				'user.fullName',
				'user.phoneNumber',
				'user.email',
			];

			const multiFormConfig = [
				{ title: 'Host Details', fields },
			];

			return multiFormConfig;
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
				record = await doApi(api.events.update({ id: data.event.uuid, data: { data: event } }));
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
