/**
  * Trees and kwH
  * Creates a header showing trees & kWh calculated from activity total of the
  * profile or campaign on the current page
  *
  * @field {text} tag Name of the tag to wrap the text in (default h4)
  * @field {text} className Custom class names to apply to the h4 tag
  */
(RaiselyComponents, _React) => {
	 // *** FIXME **** need to get correct value
	 const fieldsPerKWH = 0.1;

	 // Show value for 12 months
	 const period = 12;

	/**
	 * Once you've declared your required components, be sure to return the function
	 * representing your final Raisely Component so it can be shown on your page.
	 */
	return (props) => {
		/**
		 * If you declare fields within your Custom Component settings, they can be accessed
		 * by calling props.getValues() if set within your page editor. If values aren't set
		 * while editing, they will not be present on the values object.
		 */
		const values = props.getValues();

		const { tag, className } = values;

		/**
		  * Depending on the page being viewed, you can also access values such as
		  * the currently displayed profile and post.
		  */
		const { profile } = props.global.current;
		const { campaign } = props.global;

		// Fall back to campaign profile if there's no profile on this page
		const selectedProfile = profile || campaign.profile;

		// Activity is stored in kWh / month, convert to year
		const kWh = selectedProfile.exerciseTotal * period;
		const trees = kWh * fieldsPerKWH;

		const WrapperTag = `${tag || 'h4'}`;

		return (
			<WrapperTag className={`trees-and-kwh ${className}`}>
				The equivalent of planting {trees} football fields of trees |
				{kWh} kWh over a year
			</WrapperTag>
		);
	}
}
