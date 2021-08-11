(RaiselyComponents) => class MyRaiselyComponent extends React.Component {
	state = {};
	componentDidMount() {
		const { get } = RaiselyComponents.Common;
		const loggedIn = !!get(this.props, 'global.user');
		this.setState({ loggedIn });
	}
	render() {
		const { loggedIn } = this.state;
		return <h1>Logged in {loggedIn ? 'true' : 'false'}</h1>;
	}
}
