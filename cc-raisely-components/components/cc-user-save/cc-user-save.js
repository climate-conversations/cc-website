(RaiselyComponents) => {
	const { api } = RaiselyComponents;
	const { get, set } = RaiselyComponents.Common;
	const { save } = api;

	return class UserSaveHelper {
		static actionFields = ['host', 'facilitate', 'volunteer', 'corporate', 'research', 'fundraise'];

		static async findUserBy(attribute, record) {
			throw new Error("This API is not live yet");
			const query = _.pick(record, [attribute]);
			query.private=1;
			return getData(api.users.findAll({ query }));
		}

		/**
		 * Set alternate value for email or phone if primary is already
		 * set to something different
		 * If the primary or alternate value is not already the same as
		 * the new primary value, put the old primary value in the alternate field
		 * @param {object} existing Existing user record
		 * @param {object} user Record to update with
		 * @param {string} field Primary field
		 * @param {string} alternate Alternate field
		 */
		static setAlternate(existing, user, field, alternate) {
			const primaryValue = get(existing, field);
			const newPrimary = get(user, field);
			if (primaryValue && newPrimary && primaryValue !== newPrimary) {
				const secondaryValue = get(existing, alternate);
				if (secondaryValue && secondaryValue !== newPrimary) {
					set(user, alternate, primaryValue);
				}
			}
		}

		static prepareUserForSave(existing, user) {
			if (existing) {
				this.setAlternate(existing, user, 'email', 'private.alternateEmail');
				this.setAlternate(existing, user, 'phoneNumber', 'private.alternatePhone');
			}
			const privateKeys = Object.keys(get(user, 'private', {}));
			// Delete any action keys that are false so we don't overwrite existing
			this.actionFields.forEach((field) => {
				// eslint-disable-next-line no-param-reassign
				if (privateKeys.includes(field) && !user.private[field]) delete user.private[field];
			});
			// Raisely requires an email address, so create a dummy address if one's not
			// there so we can store the other data
			throw new Error('Must create dummy email');
		}

		static async upsertUser(record) {
			let existing;
			if (!record.uuid) {
				const promises = [];
				if (record.email) promises.push(this.findUserBy('email', record));
				if (record.phoneNumber) promises.push(this.findUserBy('phoneNumber', record));

				// Concat all results (if any)
				const existingCheck = await Promise.all(promises);
				[existing] = existingCheck.reduce((all, result) => all.concat(result), []);
				if (existing) {
					// eslint-disable-next-line no-param-reassign
					record.uuid = existing.uuid;
				}
			}
			this.prepareUserForSave(existing, record);
			return save('user', record, { partial: 1 });
		}
	};
};
