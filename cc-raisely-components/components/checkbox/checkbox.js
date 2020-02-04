(RaiselyComponents, React) => {
	return function Checkbox({ label, onChange, value, disabled }) {
		const labelClass = `form-field__label-text ${disabled ? 'disabled' : ''}`;
		return (
			<div className="field-wrapper">
				<div className="form-field form-field--checkbox form-field--not-empty form-field--valid">
					<label onClick={() => !disabled && onChange({ value: !value })}>
						<input
							type="checkbox"
							onChange={(e) => {
								e.stopPropagation();
								if (!disabled) {
									onChange(!value);
								}
							}}
							disabled={disabled}
							className="form-field--checkbox__inline"
							checked={value} />
						<span className={labelClass}>{label}</span>
					</label>
				</div>
			</div>
		);
	};
}
