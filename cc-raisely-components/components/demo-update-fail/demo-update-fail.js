(RaiselyComponents, React) => class DemoUpdateFail extends React.Component {
	state = { messages: '' };

	componentDidMount() {
		const profileUuid = this.getCurrentProfile();
		this.addMessage(`componentDidMount: ${profileUuid}`);
		this.setState({ profileUuid });
	}
	componentDidUpdate() {
		const profileUuid = this.getCurrentProfile();
		if (profileUuid !== this.state.profileUuid) {
			this.addMessage(`componentDidMount: ${profileUuid}`);
			this.setState({ profileUuid });
		}
	}
	getCurrentProfile() {
		const { get } = RaiselyComponents.Common;
		return get(this.props, 'global.current.profile.uuid');
	}
	addMessage(m) {
// 		this.setState({ messages: `${this.state.messages}
// ${m}` });
	}

	render() {
		return <pre>{this.state.messages}</pre>;
	}
}
