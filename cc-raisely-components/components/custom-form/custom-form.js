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

	function singular(word) {
		return (word[word.length - 1]) !== 's' ? word : `${word}s`;
	}

	// eslint-disable-next-line object-curly-newline
	function DefaultComplete({ completeMessage, completeLabel, history, doRedirect }) {
		// If there's a redirect, but no labels, just redirect straight away
		if (completeMessage || completeLabel) {
			doRedirect();
		}

		// eslint-disable-next-line no-param-reassign
		if (!completeMessage) completeMessage = 'Thank you. Your response has been submitted';
		// eslint-disable-next-line no-param-reassign
		if (!completeLabel) completeLabel = 'Continue';
		return (
			<React.Fragment>
				<p>{completeMessage}</p>
				{doRedirect ? <Button href={doRedirect}>{completeLabel}</Button> : ''}
			</React.Fragment>
		);
	}

	class FormStep extends React.Component {
		onChange = (values) => {
			const { pageIndex } = this.props;
			this.props.updateValues({ [pageIndex]: values });
		}

		next = async () => {
			const { save } = this.props;
			if (save) {
				this.setState({ saving: true });
				try {
					await save();
				} finally {
					this.setState({ saving: false });
				}
			}
			this.props.next();
		}

		buttons = ({ isSubmitting }) => {
			const nextText = this.props.actionText || 'Next';

			const { back, next } = this.props;

			return (
				<React.Fragment>
					{ this.props.step < 1 ? '' : (
						<Button
							type="submit"
							onClick={back()}
						>
							Previous
						</Button>
					)}
					<Button
						type="submit"
						onClick={this.next()}
					>
						{isSubmitting ? 'Saving...' : nextText}
					</Button>
				</React.Fragment>
			);
		}

		render() {
			const { pageIndex } = this.props;
			const values = this.props.values[pageIndex];
			return (<Form
				unlocked
				fields={this.props.fields}
				values={values}
				onChange={this.onChange}
				buttons={this.buttons}
			/>);
		}
	}

	class CustomForm extends React.Component {
		static getDerivedStateFromProps(props, state) {
			const { values } = props;
			if (values && !isEqual(values, state.values)) {
				return { values: props.values };
			}
			return null;
		}

		componentDidMount() {
			const steps = this.resolveFields(this.props.steps);
			this.steps = this.buildSteps(steps);

			this.loadValues();
		}

		/**
		 * Helper that calls load on the calling component
		 * if it's defined and handles setting up a loading message
		 */
		async loadValues() {
			const load = get(this.props, 'controller.load');
			if (load) {
				this.setState({ loading: true });
				try {
					await load({ dataToForm: this.dataToForm });
				} catch (e) {
					console.error(e);
					this.setState({ error: e.message });
				}
				this.setState({ loading: false });
			}
		}

		/**
		 * Find a field by a recordType.fieldId identifier
		 * @param {string} sourceId id of the field (recordType.fieldId)
		 * @return {object} The field definition
		 */
		findField(sourceId) {
			const customFields = get(this.props, 'global.campaign.config.customFields');
			const fieldSources = sourceId.split('.');
			if (fieldSources.length !== 2) throw new Error(`Badly specified field ${sourceId}. Should be in the form recordType.field`);
			const [record, fieldId] = fieldSources;
			const recordType = singular[record];

			if (!customFields[record]) throw new Error(`Unknown record type ${recordType} for custom field ${sourceId}`);
			const field = customFields[record].find(f => f.id === fieldId);
			if (!field) throw new Error(`Cannot find custom field ${fieldId} for custom field ${sourceId} (Hint: you need to reload the page after adding a custom field to the campaign)`);

			// Save the record type for help in formatting the data
			field.recordType = recordType;

			return field;
		}

		navigate = async (step) => {
			let canShow;

			// Save the last step so we know if this navigation is going backwards or forwards
			if (!this.lastStep) this.lastStep = 0;
			const direction = step > this.lastStep ? 1 : -1;
			do {
				const stepConfig = this.steps[step];
				canShow = stepConfig.condition ? stepConfig.condition(this.state.values) : true;

				// eslint-disable-next-line no-param-reassign
				if (!canShow) step += direction;
			} while ((!canShow) && (step < this.steps.length));

			const onNavigate = this.props.onNavigate || get(this.props, 'controller.updateStep');
			if (onNavigate) {
				onNavigate(step, this.state.values);
			}

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

			if (typeof field === 'string' || field.sourceFieldId) {
				const sourceId = field.sourceFieldId || field;
				definition = this.findField(sourceId);

				// If it's an object, copy over any properties specified
				if (field.sourceField) {
					Object.assign({}, definition, field);
				}
			} else {
				definition = Object.assign({}, field);
			}

			return definition;
		}

		doRedirect = () => {
			const { completeRedirect, history } = this.props;
			if (completeRedirect) history.push(completeRedirect);
		}

		/**
		 * Resolve all the fields in all the steps
		 * @param {object[]} steps The steps
		 * @return {object[]} The steps with resolved fields
		 */
		resolveFields(steps) {
			const errors = [];
			const resolvedSteps = steps.map((step) => {
				const result = Object.assign({}, step);
				if (step.fields) {
					result.fields = step.fields.map((field) => {
						try {
							return this.prepareField(field);
						} catch (e) {
							console.error(e);
							errors.push(e.message);
						}
						return field;
					});
				}
				return step;
			});
			if (errors.length) this.setState({ error: errors.join(',') });

			return resolvedSteps;
		}

		updateValues = (
			handleState, // handles state object or state update function
			afterUpdateCallback // callback after updated
		) => {
			console.log('Update called', handleState);

			const proxyCallback = (...args) => {
				if (this.props.updateValues) this.props.updateValues(handleState);
				afterUpdateCallback(...args);
			};

			// handle state update function
			if (typeof handleState === 'function') {
				return this.setState(handleState, proxyCallback);
			}

			const { state: oldState } = this;

			// setState only updates the state keys it's presented, so only batch
			// changes that are passed through handleState
			const toUpdate = {};

			Object.keys(handleState).forEach((step) => {
				// apply the updated values to the old one and append
				toUpdate[step] = { ...oldState[step], ...handleState[step] };
			});

			if (this.props.updateValues) this.props.updateValues(handleState);

			return this.setState({ values: toUpdate }, proxyCallback);
		}

		save = async () => {
			const save = this.props.save || get(this.props, 'controller.save');
			if (save) {
				await save({ values: this.state.values });
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
		dataToForm = data => mapFormToData(data, this.steps, true);
		formToData = values => mapFormToData(values, this.steps, false)

		/**
		 * Build the MultiForm steps from the declared steps
		 */
		buildSteps(steps) {
			const builtSteps = steps.map((step, index) => {
				const stepProps = Object.assign({}, step);
				delete stepProps.component;
				const Component = step.component || FormStep;

				const save = (index === steps.length - 1) ? this.save : '';

				return props => <Component {...props} {...stepProps} pageIndex={index} save={save} />;
			});

			const FinishedPanel = this.props.finalPage || get(this.props, 'controller.finalPage');

			let lastPanel;
			const { completeRedirect } = this.props;
			const doRedirect = completeRedirect ? this.doRedirect : null;

			if (FinishedPanel) {
				lastPanel = props => FinishedPanel({ ...props, doRedirect });
			} else {
				lastPanel = props => <DefaultComplete {...props} doRedirect={doRedirect} />;
			}
			builtSteps.push(lastPanel);

			return builtSteps;
		}

		render() {
			const { loadingText } = this.props;

			if (this.state.loading) {
				return (
					<React.Fragment>
						<Spinner />
						<p>{loadingText || 'Loading'}</p>
					</React.Fragment>
				);
			}

			return (
				<MultiForm {...{
					name: 'custom-form',
					...this.props,
					values: this.state.values,
					updateValues: this.updateValues,
					steps: this.steps,
					error: this.state.error,
					onNavigation: this.navigate,
				}} />
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
		const values = {};
		steps.forEach((step, index) => {
			step.fields.forEach((field) => {
				const formPath = [index];
				const dataPath = [];
				if (field.recordType) {
					dataPath.push(field.recordType);
					if (!field.core) {
						dataPath.push(field.private ? 'private' : 'public');
						formPath.push(field.private ? 'private' : 'public');
					}
				}
				dataPath.push(field.id);
				formPath.push(field.id);

				if (toForm) {
					const value = get(source, dataPath);
					set(values, formPath, value);
				} else {
					const value = get(source, formPath);
					set(values, dataPath, value);
				}
			});
		});
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
