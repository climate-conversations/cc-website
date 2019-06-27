(RaiselyComponents, React) => {
	const { TextField } = RaiselyComponents.inputs;

	const { debounce, Downshift } = RaiselyComponents.Common;
	const { Spinner } = RaiselyComponents;

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
				this.props.request(value).then((res) => {
					this.setState({
						items: res.body().data().data.map(i => ({ value: i, label: i })),
						loading: false,
					});
				});
			},
			300
		)

		render() {
			const { getItemProps } = this.props;
			if (!this.state.loading && this.state.items.length === 0) return null;

			return (
				<ul className="user-select__list" {...this.props.getMenuProps()}>
					<div className="user-select__list-container">
						{this.state.loading && <Spinner />}
						{!this.state.loading && this.state.items
							.map((item, index) => (
								<li
									className="user-select__list-item"
									{...getItemProps({
										key: item.value.uuid,
										index,
										item,
									})}>
									<span>{item.value.fullName}</span><span className="email">{item.value.email}</span>
								</li>
							))}
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
								<TextField
									className="user-select__input"
									label="Search for a person"
									placeholder={this.props.placeholder || 'Enter the persons name or email'}
									{...getInputProps({
										change: (id, value) => this.setState({ searchValue: value }),
									})}
								/>
								{this.state.searchValue ? (
									<UserSelectList
										getMenuProps={getMenuProps}
										inputValue={this.state.searchValue}
										getItemProps={getItemProps}
										request={value => this.props.api.search.getAll({
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
