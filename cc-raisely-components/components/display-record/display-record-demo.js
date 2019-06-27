(RaiselyComponents, React) => {
	const DisplayRecord = RaiselyComponents.import('display-record');

	const fields = ['eventRsvp.type', 'event.name', {
		sourceFieldId: 'user.firstName', label: 'Host',
	}];
	const associations = [
		{ uuidFrom: 'eventRsvp.userUuid', recordType: 'user' },
		{ uuidFrom: 'eventRsvp.eventUuid', recordType: 'event' },
	];

	return function ShowHost() {
		return (
			<DisplayRecord
				{...this.props}
				fields={fields}
				associations={associations}
			/>
		);
	};
};
