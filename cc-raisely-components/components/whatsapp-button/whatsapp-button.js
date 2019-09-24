(RaiselyComponents, React) => {
	const { Icon } = RaiselyComponents.Atoms;

	function normalizePhoneNumber(phone) {
		let cleanPhone = phone.replace(/[^0-9]+/g, '');
		// If it's 8 characters, prepend Singapore country code
		if (cleanPhone.length === 8) cleanPhone = `65${cleanPhone}`;
		return cleanPhone;
	}

	return class WhatsappButton extends React.Component {
		static normalizePhoneNumber(phone) {
			return normalizePhoneNumber(phone);
		}

		static generateUrl(phone, message) {
			const urlMessage = message ? encodeURIComponent(message) : '';
			const urlPhone = phone ? normalizePhoneNumber(phone) : '';
			const url = `https://api.whatsapp.com/send?phone=${urlPhone}&text=${urlMessage}`;
			return url;
		}

		render() {
			const { Button } = RaiselyComponents.Atoms;

			const { message, phone } = this.props;
			let url;
			let { label } = this.props;
			if (typeof label !== 'string') label = <Icon name="perm_phone_msg" />;

			if (phone) {
				url = this.constructor.generateUrl(phone, message);
			}
			return (
				<Button disabled={!phone} href={url} className="button--whatsapp">
					{/* {label} */}
					<Icon name="perm_phone_msg" size="small" />
				</Button>
			);
		}
	};
};
