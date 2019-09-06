(RaiselyComponents, React) => class WhatsappButton extends React.Component {
	static normalizePhoneNumber(phone) {
		let cleanPhone = phone.replace(/[^0-9]+/g, '');
		// If it's 8 characters, prepend Singapore country code
		if (cleanPhone.length === 8) cleanPhone = `65${cleanPhone}`;
		return cleanPhone;
	}

	static generateUrl(phone, message) {
		const urlMessage = encodeURIComponent(message);
		const urlPhone = this.normalizePhone(phone);
		const url = `https://api.whatsapp.com/send?phone=${urlPhone}&text=${urlMessage}`;
		return url;
	}

	render() {
		const { Button } = RaiselyComponents.Atoms;

		const { message, phone, label } = Object.assign({
			label: 'Send WhatsApp',
		}, this.props);
		const url = this.constructor.generateUrl(phone, message);
		return <Button href={url}>{label}</Button>;
	}
};
