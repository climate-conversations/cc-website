/* eslint-disable no-use-before-define */
/* eslint-disable class-methods-use-this */
/**
 * Helper to allow defining multi-step forms in a more declarative form
 * If all or most of the steps are just a page of form inputs, you
 * can use this to just list the form inputs that you want to appear
 * on each page, and this will generate the appropriate multistep form
 */
(RaiselyComponents, React) => {
	const { MultiForm } = RaiselyComponents.Molecules;
	const { Form, Spinner } = RaiselyComponents;
	const { Button } = RaiselyComponents.Atoms;
	const { get, isEqual, set } = RaiselyComponents.Common;

	const ReturnButton = RaiselyComponents.import('return-button');

	const errorStyle = 'style="border: 1px solid red;"';

	function singular(word) {
		return (word[word.length - 1]) !== 's' ? word : word.substr(0, word.length - 1);
	}
	function plural(word) {
		return (word[word.length - 1]) === 's' ? word : `${word}s`;
	}

	// eslint-disable-next-line object-curly-newline
	function DefaultComplete({ completeText, completeLabel, history, doRedirect }) {
		// If there's a redirect, but no labels, just redirect straight away
		if (!(completeText || completeLabel) && doRedirect) {
			doRedirect();
		}

		// eslint-disable-next-line no-param-reassign
		if (!completeText) completeText = 'Thank you. Your response has been saved.';
		// eslint-disable-next-line no-param-reassign
		if (!completeLabel) completeLabel = 'Continue';
		return (
			<div className="custom-form__success">
				<p>{completeText}</p>
				{doRedirect ? <Button onClick={doRedirect}>{completeLabel}</Button> : ''}
			</div>
		);
	}

	class FormStep extends React.Component {
		constructor(props) {
			console.log('FormStep constructor');
			super(props);
			this.state = {};
		}

		onChange = (values) => {
			console.log('FormStep.onChange');
			const { pageIndex } = this.props;
			this.props.updateValues({ [pageIndex]: values });
		}

		next = async () => {
			console.log('FormStep.next');
			const { save, shouldSave } = this.props;
			if (shouldSave()) {
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

		buttons = () => {
			console.log('FormStep.buttons');
			const nextText = this.props.shouldSave() ?
				'Save' : this.props.actionText || 'Next';

			const { back } = this.props;

			return (
				<div className="custom-form__navigation">
					{ this.props.step < 1 ? '' : (
						<Button
							type="button"
							disabled={this.state.saving}
							onClick={back}
						>
							Previous
						</Button>
					)}
					<Button
						type="button"
						onClick={this.next}
						disabled={this.state.saving}
					>
						{this.state.saving ? 'Saving...' : nextText}
					</Button>
				</div>
			);
		}

		render() {
			console.log('FormStep.render');
			const { props } = this.props;
			const { pageIndex, title, description } = this.props;
			const values = this.props.values[pageIndex];
			const className = `custom-form__step custom-form__step--${pageIndex + 1}`;

			return (
				<div className={className}>
					<div className="custom-form__step-header">
						{title ? (
							<h3>{title}</h3>
						) : ''}
						<div className="form-description">
							<p>{description}</p>
						</div>
					</div>
					<Form
						{...props}
						unlocked
						fields={this.props.fields}
						values={values}
						onChange={this.onChange}
						buttons={this.buttons}
					/>
				</div>
			);
		}
	}

	class CustomForm extends React.Component {
		constructor(props) {
			super(props);
			this.state = { values: [] };
		}

		componentDidMount() {
			this.resolvedSteps = this.resolveFields(this.props.steps);
			// eslint-disable-next-line react/no-did-mount-set-state
			this.setState({ steps: this.buildSteps(this.resolvedSteps) });

			this.loadValues();
		}

		/**
		 * If the parent updates the steps or the values
		 * reload steps or values respectively
		 */
		componentDidUpdate(prevProps, prevState) {
			const { values } = this.props;

			const changed = {};

			if (!isEqual(this.props.steps, this.lastSteps)) {
				this.resolvedSteps = this.resolveFields(this.props.steps);
				changed.steps = this.buildSteps(this.resolvedSteps);
			}

			if (values && !isEqual(values, this.state.values)) {
				changed.values = values;
			}

			if (Object.keys(changed).length) return this.setState(changed);

			return null;
		}

		saveUuids(values) {
			this.recordKeys = {};
			Object.keys(values).forEach((record) => {
				if (record === 'interaction') {
					Object.keys(values[record]).forEach((interaction) => {
						const key = `${record}.${interaction}.uuid`;
						const value = get(values, key);
						if (value) set(this.recordKeys, key, value);
					});
				} else {
					const key = `${record}.uuid`;
					const value = get(values, key);
					if (value) set(this.recordKeys, key, value);
				}
			});
			console.log('saveUuids', this.recordKeys);
		}

		retrieveRecordUuids = (data) => {
			const values = this.recordKeys || {};

			Object.keys(values).forEach((record) => {
				if (record === 'interaction') {
					Object.keys(values[record]).forEach((interaction) => {
						const key = `${record}.${interaction}.uuid`;
						const value = get(values, key);
						const exists = get(data, key);
						if (value && !exists) set(data, key, value);
					});
				} else {
					const key = `${record}.uuid`;
					const value = get(values, key);
					const exists = get(data, key);
					if (value && !exists) set(data, key, value);
				}
			});
		}

		/**
		 * Helper that calls load on the calling component
		 * if it's defined and handles setting up a loading message
		 */
		async loadValues() {
			console.log('CustomForm.loadValues', this.state);

			try {
				const load = get(this.props, 'controller.load');
				if (load) {
					this.setState({ loading: true });
					const values = await load({ dataToForm: this.dataToForm });
					this.setState({ values });
				}
			} catch (e) {
				console.error(e);
				this.setState({ error: e.message });
			} finally {
				this.setState({ loaded: true });
			}
			console.log('CustomForm.loadValues (finished)', this.state);
		}

		/**
		 * Find a field by a recordType.fieldId identifier
		 * @param {string} sourceId id of the field (recordType.fieldId)
		 * @return {object} The field definition
		 */
		findField(sourceId) {
			console.log('CustomForm.findField');
			const customFields = get(this.props, 'global.campaign.config.customFields');
			const fieldSources = sourceId.split('.');
			const valid = fieldSources.length === 2 || (fieldSources[0] === 'interaction' && fieldSources.length === 3);
			if (!valid) throw new Error(`Badly specified field "${sourceId}". Should be in the form recordType.field or interaction.category.field`);
			let [recordType, category, fieldId] = fieldSources;
			if (fieldSources.length === 2) {
				fieldId = category;
				category = null;
			}
			recordType = singular(recordType);

			if (!customFields[recordType]) throw new Error(`Unknown record type "${record}" for custom field "${sourceId}"`);
			const field = customFields[recordType].find(f => f.id === fieldId);
			if (!field) throw new Error(`Cannot find custom field "${fieldId}" for custom field "${sourceId}" (Hint: you need to reload the page after adding a custom field to the campaign)`);

			// Save the record type for help in formatting the data
			field.recordType = recordType;
			if (category) field.interactionCategory = category;

			return field;
		}

		findNextStep(direction, step) {
			if (!this.lastStep) this.lastStep = 0;
			if (!step && step !== 0) step = this.lastStep + direction;
			let canShow;

			// Scan through steps until we find one we can show
			// don't bother checking if we're at the start or end
			while ((!canShow) && (step > 0) && (step < this.state.steps.length - 1)) {
				const stepConfig = this.props.steps[step];
				if (stepConfig.condition) {
					console.log(`Evaluating step ${step} condition`, this.state.values);
				}
				canShow = stepConfig.condition ? stepConfig.condition(this.state.values) : true;

				if (!canShow) {
					// eslint-disable-next-line no-param-reassign
					step += direction;
					// eslint-disable-next-line no-param-reassign
					step = Math.max(0, Math.min(step, this.state.steps.length - 1));
				}
			}
			return step;
		}

		shouldSave = () => {
			const step = this.findNextStep(1);
			console.log(step, this.props.steps.length)
			const shouldSave = (step >= this.props.steps.length);

			console.log('CustomForm.shouldSave', shouldSave);

			return shouldSave;
		}

		navigate = (step) => {
			console.log('CustomForm.navigate', this.state);
			let canShow;

			// Save the last step so we know if this navigation is going backwards or forwards
			const direction = step >= this.lastStep ? 1 : -1;

			step = this.findNextStep(direction, step);

			const onNavigate = this.props.onNavigate || get(this.props, 'controller.updateStep');
			if (onNavigate) {
				const result = onNavigate(step, this.state.values, this.formToData, this.dataToForm);
				if (result) this.setState({ values: result });
			}
			console.log('CustomForm.navigate (finished)', this.state);

			this.lastStep = step;
			return step;
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

		doRedirect = () => {
			console.log('doRedirect');
			const { history } = this.props;
			if (this.completeRedirect) history.push(this.completeRedirect);
		}

		resolveInteractionFields(description) {
			const category = description.interactionCategory;

			const allInteractionFields = get(this.props, 'global.campaign.config.interactionCategoryFields', {})[category];

			const fieldList = [];
			allInteractionFields.forEach((field) => {
				let include = description.include ? description.include.indexOf(field) > -1 : true;
				if (description.exclude) include = description.exclude.indexOf(field) === -1;
				if (include) fieldList.push(`interaction.${category}.${field}`);
			});

			return fieldList;
		}

		/**
		 * Resolve all the fields in all the steps
		 * @param {object[]} steps The steps
		 * @return {object[]} The steps with resolved fields
		 */
		resolveFields(steps) {
			// Cache steps so we don't rerun this too frequently
			this.lastSteps = steps;
			console.log('CustomForm.resolveFields');
			if (!(steps && Array.isArray(steps))) return null;

			const resolvedSteps = steps.map((step) => {
				const result = Object.assign({}, step);
				if (step.fields) {
					result.fields = [];

					// Expand an interaction category into its individual fields
					const expandedFields = [];
					step.fields.forEach((field) => {
						if (field.interactionCategory) {
							expandedFields.push(...this.resolveInteractionFields(field));
						} else {
							expandedFields.push(field);
						}
					});

					// Fully describe each field
					result.fields = expandedFields.map((field, fieldIndex) => {
						try {
							return this.prepareField(field);
						} catch (e) {
							console.error(e);
							return {
								id: `error-${fieldIndex}`,
								type: 'rich-description',
								default: `<p ${errorStyle}>Error: ${e.message}</p>`,
							};
						}
					});
				}
				return result;
			});
			console.log('Resolved Steps', resolvedSteps);

			return resolvedSteps;
		}

		updateValues = (
			handleState, // handles state object or state update function
			afterUpdateCallback // callback after updated
		) => {
			console.log('Update called', handleState);

			const proxyCallback = (...args) => {
				if (this.props.updateValues) this.props.updateValues(handleState);
				if (afterUpdateCallback) afterUpdateCallback(...args);
			};

			// handle state update function
			if (typeof handleState === 'function') {
				return this.setState(handleState, proxyCallback);
			}

			const { state: oldState } = this;

			// setState only updates the state keys it's presented, so only batch
			// changes that are passed through handleState
			const toUpdate = oldState.values || {};

			Object.keys(handleState).forEach((step) => {
				// apply the updated values to the old one and append
				toUpdate[step] = { ...oldState[step], ...handleState[step] };
			});

			if (this.props.updateValues) this.props.updateValues(handleState);

			return this.setState({ values: toUpdate }, proxyCallback);
		}

		save = async () => {
			console.log('CustomForm.save', this.state);
			const save = this.props.save || get(this.props, 'controller.save');
			if (save) {
				try {
					// Clear any previous error message
					this.setState({ error: false });
					await save(this.state.values, this.formToData);
				} catch (e) {
					console.error(e);
					this.setState({ error: e.message });
					// Rethrow so that next step is aborted
					throw e;
				}
			}
		}

		/**
		 * Helpers to convert data obtained from API call(s) to format
		 * for initialising _this_ form
		 * Data should be formatted with each recordType as a top level
		 * key, followed by the fields (appropriately nested in public or
		 * private where necessary)
		 * Any fields that aren't associated with a recordType should
		 * be at the top level
		 * @example
		 * dataToForm({
		 * 	profile: {
		 * 		name,
		 * 		private: {},
		 *  },
		 *  user: {
		 * 		firstName: {},
		 * 	},
		 *  randomField,
		 * });
		 */
		dataToForm = (data) => {
			this.saveUuids(data);
			return mapFormToData(data, this.resolvedSteps, true);
		}
		formToData = (values) => {
			const data = mapFormToData(values, this.resolvedSteps, false);
			this.retrieveRecordUuids(data);

			return data;
		};

		/**
		 * Build the MultiForm steps from the declared steps
		 */
		buildSteps(steps) {
			console.log('CustomForm.buildSteps');
			if (!(steps && Array.isArray(steps))) return null;

			const builtSteps = steps.map((step, index) => {
				let stepProps = Object.assign({}, step, {
					save: this.save,
					shouldSave: this.shouldSave,
				});
				delete stepProps.component;
				const Component = step.component || FormStep;

				if (index === steps.length - 1) {
					stepProps = { actionText: 'Save', ...stepProps };
				}

				return props => <Component {...props} {...stepProps} pageIndex={index} />;
			});

			const FinishedPanel = this.props.finalPage || get(this.props, 'controller.finalPage');

			let lastPanel;
			const { completeRedirect, redirectToReturnTo } = this.props;

			const finishedProps = { completeRedirect };

			if (redirectToReturnTo) {
				const ReturnButtonClass = ReturnButton();
				if (ReturnButtonClass) {
					const { getReturnUrl } = ReturnButtonClass.type;
					finishedProps.completeRedirect = getReturnUrl(this.props, '/dashboards', true);
					console.log(`set redirect to ${finishedProps.completeRedirect}`)
				}
			}

			this.completeRedirect = finishedProps.completeRedirect;

			finishedProps.doRedirect = finishedProps.completeRedirect ? this.doRedirect : null;

			if (FinishedPanel) {
				lastPanel = props => FinishedPanel({ ...props, ...finishedProps });
			} else {
				lastPanel = props => <DefaultComplete {...props} {...finishedProps} />;
			}
			builtSteps.push(lastPanel);

			return builtSteps;
		}

		render() {
			console.log('CustomForm.render');

			if (!this.state.loaded) {
				const { loadingText } = this.props;

				return (
					<React.Fragment>
						<Spinner />
						<p>{loadingText}</p>
					</React.Fragment>
				);
			}

			if (!get(this.props, 'global.campaign')) {
				console.error(`ERROR: ${this.constructor.name} is missing this.props.global.campaign`);
				return (
					<div className="error">
						<p>props.global.campaign property is missing.</p>
						<p>
							Did you remember to pass the props into this component? (eg
							{'<CustomForm {...this.props} />'}
						</p>
					</div>
				);
			}

			if (!this.state.steps) {
				console.error(`ERROR: ${this.constructor.name} must have an array of objects for the steps property`);
				return <p className="error">You must specify the steps property for this form</p>;
			}

			return (
				<div className="custom-form-wrapper">
					{this.state.error ? <div className="custom-form--error">{this.state.error}</div> : ''}
					<MultiForm {...{
						name: 'custom-form',
						...this.props,
						values: this.state.values,
						updateValues: this.updateValues,
						steps: this.state.steps,
						error: this.state.error,
						onNavigate: this.navigate,
					}} />
				</div>
			);
		}
	}

	/**
	 * Helper for mapping form values to data
	 * @param {object} source
	 * @param {object[]} steps
	 * @param {boolean} toForm
	 */
	function mapFormToData(source, steps, toForm) {
		console.log('CustomForm.mapFormToData', source, steps);
		const values = {};
		steps.forEach((step, index) => {
			// If no fields, then might be a custom step
			if (step.fields) {
				step.fields.forEach((field) => {
					const formPath = [index];
					const dataPath = [];
					if (field.recordType) {
						dataPath.push(field.recordType);
						if (field.interactionCategory) dataPath.push(field.interactionCategory);
						if (!field.core) {
							dataPath.push(field.private ? 'private' : 'public');
							formPath.push(field.private ? 'private' : 'public');
						}
					}
					dataPath.push(field.id);
					formPath.push(field.id);

					if (toForm) {
						const value = get(source, dataPath);
						// Only set the value if it's present, don't fill with nulls
						if (value !== undefined) set(values, formPath, value);
					} else {
						const value = get(source, formPath);
						if (value !== undefined) set(values, dataPath, value);
					}
				});
			}
		});
		console.log('CustomForm.mapFormToData (finished)');

		return values;
	}

	// CustomForm.propTypes = {
	// 	/**
	// 	 * A controller that will receive updates for certain actions
	// 	 * methods that will be called
	// 	 * updateValues() - Called whenever there's a change to values
	// 	 * updateStep() - Called whenever advancing/reversing to another step
	// 	 * save() - To save the form (if save property is not defined)
	//	 * finalPage() - Renders the final page after form has been submitted
	// 	 */
	// 	controller: PropTypes.object,
	//	completeText: PropTypes.string,
	//	completeLabel: PropTypes.string,
	//	completeRedirect: PropTypes.string,
	//  finalPage: PropTypes.function,
	// 	/** Definition of the steps for the form */
	// 	steps: PropTypes.arrayOf(PropTypes.shape({
	// 		/** Title of the step */
	// 		title: PropTypes.string,
	// 		/** Fields for the step */
	// 		fields: PropTypes.arrayOf(PropTypes.Object),
	// 		/** Component to use for the step */
	// 		component: PropTypes.function,
	// 	})).isRequired,
	//	/** Update values */
	//	updateValues: PropTypes.function,
	//  /** Location to redirect to on successful submission */
	//  redirect: PropTypes.string,
	// 	/** Function to call to save the form once all steps are complete */
	// 	save: PropTypes.function,
	// 	/** Message to show while saving */
	// 	saveMessage: PropTypes.string,
	// };

	return CustomForm;
};
