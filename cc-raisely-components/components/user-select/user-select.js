(RaiselyComponents, React) => {
	const { Input } = RaiselyComponents.Atoms;

	const { debounce, Downshift } = RaiselyComponents.Common;
	const { Spinner } = RaiselyComponents;
	const { getData } = RaiselyComponents.api;

	const queryHelper = data => ({
		...data,
		limit: 5,
		offset: 0,
		order: 'desc',
	});

	class UserSelectList extends React.Component {
		state = {
			loading: false,
			items: [],
		}

		componentDidMount() {
			this.search(this.props.inputValue);
		}

		componentWillReceiveProps(nextProps) {
			if (nextProps.inputValue !== this.props.inputValue) {
				this.search(nextProps.inputValue);
			}
		}

		search = debounce(
			(value) => {
				this.setState({ loading: true });
				getData(this.props.request(value))
					.then(data => this.setState({
						items: data.map(i => ({ value: i, label: i })),
						loading: false,
					}))
					.catch(error => {
						console.error(error);
						this.setState({ error: error.message || 'Unknown error occurred', loading: false });
					});
			},
			300
		)

		renderOptions(items) {
			if (!items.length) {
				return (
					<li className="user-select__list-item no__results">
						No results
					</li>
				);
			}

			const { getItemProps } = this.props;

			return this.state.items
				.map((item, index) => (
					<li
						className="user-select__list-item list__item"
						{...getItemProps({
							key: item.value.uuid,
							index,
							item,
						})}>
						<span className="list__item--title">{item.value.fullName}</span>
						<span className="email list__item--subtitle">{item.value.email}</span>
					</li>
				));
		}

		render() {
			if (!this.state.loading && this.state.items.length === 0) return null;

			const { error } = this.state;

			if (error) {
				return <p className="error">{error}</p>;
			}

			return (
				<ul className="user-select__list list__wrapper" {...this.props.getMenuProps()}>
					<div className="user-select__list-container">
						{this.state.loading ? (
							<Spinner className="spinner	" />
						) : this.renderOptions(this.state.items)}
					</div>
				</ul>
			);
		}
	}

	return class UserSelect extends React.Component {
		state = {
			searchValue: '',
		}

		render() {
			const { label } = this.props;

			return (
				<div className="user-select">
					<Downshift
						onSelect={({ value }) => {
							this.props.update({ user: value, userUuid: value.uuid });
						}}
						inputValue={this.state.searchValue}
						itemToString={item => (item ? item.value : '')}>
						{({
							getInputProps,
							getItemProps,
							getLabelProps,
							getMenuProps,
							isOpen,
							inputValue,
							highlightedIndex,
							selectedItem,
						}) => (
							<div>
								<Input
									className="user-select__input"
									label={label || 'Search for a person'}
									placeholder={this.props.placeholder || 'Enter the persons name or email'}
									{...getInputProps({
										change: (id, value) => this.setState({ searchValue: value }),
									})}
									type="TextField"
									autocomplete="off"
									id="the-users-name"
									name="the-users-name"
								/>
								{this.state.searchValue ? (
									<UserSelectList
										getMenuProps={getMenuProps}
										inputValue={this.state.searchValue}
										getItemProps={getItemProps}
										request={value => this.props.api.search.get({
											query: queryHelper({
												q: value,
												recordTypes: 'user',
											}),
										})}
									/>
								) : null}
							</div>
						)}
					</Downshift>
				</div>
			);
		}
	};
};
