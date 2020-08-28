(RaiselyComponents) => {
	const { api, Spinner } = RaiselyComponents;
	const { getData } = api;
	const websiteCampaignUuid = 'f2a3bc70-96d8-11e9-8a7b-47401a90ec39';
	return class AdminFacilLoop extends React.Component {
		state = {};

		componentDidMount() {
			this.load();
		}

		async load() {
			const since = '2020-07-01';
			try {
				// Load post surveys
				const [postSurveys, trainingRsvps, allRsvps] = await Promise.all([
					getData(api.interactions.getAll({
						query: {
							category: 'post-survey-2020',
							'detail.occurredAtGTE': since,
							private: 1,
						},
					})),
					// Load training rsvps
					getData(api.eventRsvps.getAll({
						query: {
							'event.eventType': 'Facilitator Training',
							'event.startAt': since,
							campaign: websiteCampaignUuid,
							private: 1,
						},
					})),
					getData(api.eventRsvps.getAll({
						query: {
							private: 1,
							'event.startAt': since,
							limit: 1000,
						},
					})),
				]);

				const allEvents = new Set(allRsvps.map(r => r.evenUuid));
				const interestedFacilitators = new Set(postSurveys.map(s => s.userUuid));
				const allGuests = new Set(allRsvps.filter(r => r.type ==='guest').map(r => r.userUuid));
				const allTraineeRsvps = new Set(trainingRsvps.map(r => r.userUuid));
				const allTraineeCompletes = new Set(trainingRsvps.filter(r => r.attended).map(r => r.userUuid));
				const allNewFacils = allRsvps.filter(r => ['facilitator', 'co-facilitator'].includes(r.type)).map(r => r.userUuid);

				const intersect = (a, b) => {
					const include = b.includes ? 'includes' : 'has';
					return [...a].filter(x => b[include](x));
				};

				const ratios = {
					cta: { value: interestedFacilitators.size, percent: 100 * interestedFacilitators.size / allGuests.size },
					rsvpTraining: { value: intersect(allTraineeRsvps, interestedFacilitators).length, percent: 100 * intersect(allTraineeRsvps, interestedFacilitators).length / interestedFacilitators.size },
					completeTraining: { value: allTraineeCompletes.size, percent: 100 * allTraineeCompletes / allTraineeRsvps.size },
					allNewFacils: { value: intersect(allTraineeCompletes, allNewFacils).length, percent: 100 * intersect(allTraineeCompletes, allNewFacils).length / allTraineeCompletes.size },
				};

				this.setState({ ratios, loaded: true });
			} catch (error) {
				console.error(error);
				this.setState({ error: error.message || 'An unknown error occurred', loaded: true, })
			}
		}

		render() {
			const { error, loaded, ratios } = this.state;
			if (!loaded) return <Spinner />
			if (error) {
				return (
					<div className="error">{error}</div>
				)
			}
			const labels = {
				cta: 'Expresse interest in CTA',
				rsvpTraining: 'RSVP to training',
				completeTraining: 'Complete training',
				allNewFacils: 'Facilitates a conversation',
			}
			const keys = ['cta', 'rsvpTraining', 'completeTraining', 'allNewFacils'];
			return (
				<div className="facilitator-progression">
					<h2>Facilitator Progression</h2>
					{keys.map(key => (
						<div className="record-display__field">
							<div className="record-display__label">
								{labels[key]}
							</div>
							<div className="record-display__value">
								{ratios[key].value}
							</div>
							<div className="record-display__value">
								{Math.round(ratios[key].percent)} %
							</div>
						</div>
					))}
				</div>
			);
		}
	};
};
