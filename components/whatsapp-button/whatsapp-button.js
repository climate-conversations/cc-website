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
			const { message, phone, label, showIcon } = this.config();
			let { url } = this.config();

			if (phone && !url) {
				url = this.constructor.generateUrl(phone, message);
			}

			let className;
			if (label) {
				className = 'button--primary';
			} else {
				className = 'button--whatsapp';
			}

			return (
				<Button
					disabled={!url}
					href={url}
					className={className}>
					{showIcon ? <image className="button--whatsapp" /> : ''}
					{label || ''}
				</Button>
			);
		}
	};
};
