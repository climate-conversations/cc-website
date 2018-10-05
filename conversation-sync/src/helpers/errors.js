class AppError extends Error {
	constructor(status, errorCode, message, error) {
		console.error(error);

		// Calling parent constructor of base Error class.
		super(message);

		// Saving class name in the property of our custom error as a shortcut.
		this.name = this.constructor.name;

		// Capturing stack trace, excluding constructor call from it.
		Error.captureStackTrace(this, this.constructor);

		// get the title + description
		switch (errorCode) {
			case 'invalid url':
				this.errorTitle = message;
				this.errorDetail = 'Please ensure it is accessible and responding 20x to empty POST requests.';
				break;
			default:
				this.errorTitle = message;
				this.errorDetail = null;
				break;
		}

		this.status = status || 500;
		this.errorCode = errorCode;
		this.original = error;
		this.body = {
			errors: [
				{
					message,
					status: this.status,
					code: errorCode,
					title: this.errorTitle,
					detail: this.errorDetail,
				},
			],
		};
	}
}

module.exports = AppError;
