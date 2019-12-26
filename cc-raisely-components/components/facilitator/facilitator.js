/**
 * Helper functions for locating facilitators
 */
(RaiselyComponents, React) => {
	const { api, Common } = RaiselyComponents;
	const { get } = Common;
	const { getData } = api;

	return class Facilitator extends React.Component {
		/**
		 * @param {string} teamUuid Uuid of a team profile record
		 * @returns {User[]} User records for facils in the team leaders team
		 */
		static async getFacilitatorsByTeam(teamUuid) {
			const facilitatorProfiles = await getData(api.profiles.members.getAll({
				id: teamUuid,
				query: { private: 1 },
			}));

			const facilitators = facilitatorProfiles.map(p => p.user);
			return facilitators;
		}

		/**
		 * Selects facils in the leaders teams. Note, if the leader has more than one team
		 * chooses the first team returned by /profiles?user=:leaderUuid
		 * @param {string} leaderUuid Uuid of the team leader's user record
		 * @returns {User[]} User records for facils in the team leaders team
		 */
		static async getFacilitatorsByLeader(leaderUuid) {
			const profiles = await getData(api.profiles.getAll({
				user: leaderUuid,
			}));
			const profile = profiles.find(p => p.type ==='GROUP');

			const facilitators = await this.getFacilitatorsByTeam(profile.uuid);
			return facilitators;
		}

		/**
		 * Calls isTeamMode to determine if the component should render for team
		 * members or the current user, and returns the appropriate uuids for
		 * either the user or team members
		 * @param {object} props The component props
		 * @return {User[]}
		 */
		static async getTeamOrFacilitators(props) {
			let users = [get(props, 'global.user')];

			if (this.isTeamMode(props)) {
				let currentUserUuid = get(props, 'global.user.uuid');
				users = this.getFacilitatorsByLeader(currentUserUuid);
				if (!users.length) {
					throw new Error('There are no active facilitators in your team')
				}
			}

			return users;
		}

		/**
		 * Determines from a components properties if it should be rendering
		 * for the current user or their team
		 * @param {object} props The components properties
		 * @return {boolean}
		 */
		static isTeamMode(props) {
			return props.getValues().show === 'team';
		}

		render() {
			return <p>Helper only</p>
		}
	};
};
