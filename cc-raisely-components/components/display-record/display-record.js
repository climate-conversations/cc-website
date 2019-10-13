(RaiselyComponents, React) => {
	const { Spinner } = RaiselyComponents;
	const { dayjs, get, startCase } = RaiselyComponents.Common;
	const renderHtml = RaiselyComponents.Common.htmr;
	const { api } = RaiselyComponents;

	const errorStyle = 'style="border: 1px solid red;"';

	function singular(word) {
		return (word[word.length - 1]) !== 's' ? word : word.substr(0, word.length - 1);
	}
	function plural(word) {
		return (word[word.length - 1]) === 's' ? word : `${word}s`;
	}

	function renderValue({ values, field }) {
		const path = [];
		if (field.recordType) path.push(field.recordType);
		if (!field.core) path.push(field.private ? 'private' : 'public');
		path.push(field.id);

		const value = get(values, path);
		const content = field.default;

		switch (field.type) {
			case 'select':
				return field.options[value] || value;
			case 'checkbox':
				return value ? 'Yes' : 'No';
			case 'rich-description':
				return (content.indexOf('</') !== -1) ?
					renderHtml(content) : renderHtml(`<p>${content}</p>`);
			case 'date':
				return dayjs(value).format(field.format);
			default:
				if (value === null || (typeof value === 'undefined')) return 'N/A';
				return value;
		}
	}

	function Field({ values, field }) {
		const value = renderValue({ values, field });

		return (
			<div className="record-display__field">
				<div className="record-display__label">{field.label}</div>
				<div className="record-display__value">{value}</div>
			</div>
		);
	}

	return class DisplayRecord extends React.Component {
		state = { loading: true };

		componentDidMount() {
			this.load()
				.catch(e => console.error(e));
		}
		componentDidUpdate() {
			const newValues = get(this, 'props.values', {});
			const oldValues = get(this, 'state.values', {});
			const hasChanged = Object.keys(newValues)
				.find(key => newValues[key] !== oldValues[key]);
			if (hasChanged) {
				this.load()
					.catch(e => console.error(e));
			}
		}

		getConfig() {
			console.log('Configuring display record');
			const config = Object.assign({
				models: [],
				associatins: [],
			}, this.props);
			if (this.props.getValues) Object.assign(config, this.props.getValues());

			return config;
		}

		setFields = () => {
			const { fields } = this.getConfig();
			const resolvedFields = this.resolveFields(fields);
			this.setState({ fields: resolvedFields });
		}

		// eslint-disable-next-line class-methods-use-this
		generateField(recordType, id, isPrivate) {
			return {
				id,
				recordType,
				private: isPrivate,
				label: startCase(`${recordType} ${id}`),
			};
		}

		explodeModel(model) {
			const { values } = this.state;
			const record = values[model];
			const recordType = singular(model);

			const customFields = get(this.props, `global.campaign.config.customFields.${recordType}`, [])
				.map(field => ({ ...field }));

			const fieldIds = customFields.map(field => `${field.recordType}.${field.id}`);

			// Append any unknown public fields
			Object.keys(record.public || {}).forEach((key) => {
				if (!fieldIds.includes(`${recordType}.${key}`)) {
					customFields.push(this.generateField(recordType, key, false));
				}
			});
			Object.keys(record.private || {}).forEach((key) => {
				if (!fieldIds.includes(`${recordType}.${key}`)) {
					customFields.push(this.generateField(recordType, key, true));
				}
			});

			return customFields;
		}

		/**
		 * Find a field by a recordType.fieldId identifier
		 * @param {string} sourceId id of the field (recordType.fieldId)
		 * @return {object} The field definition
		 */
		findField(sourceId) {
			console.log('CustomForm.findField');
			if (!this.props.global) {
				throw new Error('Developer, please pass do {...this.props}');
			}
			const fieldSources = sourceId.split('.');
			if (fieldSources[1] === 'all') {
				return this.explodeModel(fieldSources[0]);
			}

			const customFields = get(this.props, 'global.campaign.config.customFields', {});
			if (fieldSources.length !== 2) throw new Error(`Badly specified field "${sourceId}". Should be in the form recordType.field`);
			const [record, fieldId] = fieldSources;
			const recordType = singular(record);

			if (!customFields[recordType]) throw new Error(`Unknown record type "${record}" for custom field "${sourceId}"`);
			const field = customFields[recordType].find(f => f.id === fieldId);
			if (!field) throw new Error(`Cannot find custom field "${fieldId}" for custom field "${sourceId}" (Hint: you need to reload the page after adding a custom field to the campaign)`);

			// Save the record type for help in formatting the data
			field.recordType = recordType;

			return field;
		}
		/**
		 * Prepare a field for use in the form
		 * Accepts fields defined by object, or simply a string identifying recordType.fieldId
		 * which will be resolved
		 * @param {object|string} field
		 * @return {object}
		 */
		prepareField(field) {
			let definition;
			console.log('CustomForm.prepareField');

			if (typeof field === 'string' || Object.keys(field).includes('sourceFieldId')) {
				let sourceId = field.sourceFieldId || field;
				// Happens if sourceFieldId is '', which happens when user is building form
				if (typeof sourceId !== 'string') sourceId = '';
				definition = this.findField(sourceId);

				// If it's an object, copy over any properties specified
				if (field.sourceFieldId) {
					definition = Object.assign({}, definition, field);
				}
			} else {
				definition = Object.assign({}, field);
			}

			return definition;
		}

		/**
		 * Resolve all the fields
		 * @param {object[]} fields The fields
		 * @return {object[]} The resolved fields
		 */
		resolveFields(fields) {
			console.log('CustomForm.resolveFields');
			if (!(fields && Array.isArray(fields))) return null;

			const resolvedFields = [];

			fields.forEach((field, fieldIndex) => {
				try {
					const foundField = this.prepareField(field);
					// If the field was exploded to many fields
					if (Array.isArray(foundField)) {
						resolvedFields.push(...foundField.map(f => this.prepareField(f)));
					} else {
						resolvedFields.push(foundField);
					}
				} catch (e) {
					console.error(e);
					resolvedFields.push({
						id: `error-${fieldIndex}`,
						type: 'rich-description',
						default: `<p ${errorStyle}>Error: ${e.message}</p>`,
					});
				}
			});

			return resolvedFields;
		}

		load = async () => {
			console.log('DisplayFields.load');
			const { associations, models } = this.getConfig();

			const values = Object.assign(
				{},
				get(this.state, 'values', {}),
				get(this.props, 'values', {})
			);

			const valueKeys = Object.keys(values);
			try {
				const modelsToFetch = models
					.filter(model => !valueKeys.includes(model));

				console.log('Loading: ', models, 'received: ', valueKeys)

				if (modelsToFetch.length) {
					Object.assign(values, await api.quickLoad({
						models: modelsToFetch,
						props: this.props,
						required: true,
					}));
				}
			} catch (e) {
				console.error(e);
				this.setState({ error: e.message });
				throw e;
			}

			if (Array.isArray(associations)) {
				const associationsToLoad = associations
					.filter(assoc => !valueKeys.includes(assoc));

				const loaded = associationsToLoad.map(async ({ uuidFrom, recordType }) => {
					const uuid = get(values, uuidFrom);
					if (uuid) {
						const model = plural(recordType);
						const key = singular(recordType);
						values[key] = await api[model].get(uuid);
					}
				});

				await Promise.all(loaded);
			}

			this.setState({ values, loading: false }, this.setFields);
		}

		render() {
			// eslint-disable-next-line object-curly-newline
			const { loading, error, values, fields } = this.state;

			if (!get(this.props, 'global.campaign')) {
				console.error(`ERROR: ${this.constructor.name} is missing this.props.global.campaign`);
				return (
					<div className="error">
						<p>props.global.campaign property is missing.</p>
						<p>
							Did you remember to pass the props into this component? (eg
							{'<DisplayRecord {...this.props} />'}
						</p>
					</div>
				);
			}

			if (loading || !fields) {
				return <Spinner />;
			}
			if (error) {
				return (
					<div className="error">
						{this.state.error}
					</div>
				);
			}

			const settings = this.getConfig();
			const name = settings.name || '';

			const className = `record-display ${name}`;

			return (
				<div className={className}>
					{fields.map(field => (<Field
						{...this.props}
						field={field}
						values={values}
					/>))}
				</div>
			);
		}
	};
};
