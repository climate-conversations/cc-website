(RaiselyComponents, React) => {
	const { Button } = RaiselyComponents.Atoms;

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

		config() {
			if (this.props.getValues) return this.props.getValues();
			return this.props;
		}

		render() {
			const { message, phone, label } = this.config();
			let { url } = this.config();

			if (phone && !url) {
				url = this.constructor.generateUrl(phone, message);
			}

			const style = {};
			const whatsAppLogo = 'https://raisely-images.imgix.net/switchon/uploads/580-b-57-fcd-9996-e-24-bc-43-c-543-png.png';
			if (!label) style.background = `url(${whatsAppLogo})`;

			return (
				<Button
					disabled={!url}
					href={url}
					style={style}
					className="button--whatsapp">
					{label || ''}
				</Button>
			);
		}
	};
};
