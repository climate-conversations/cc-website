const winston = require('winston');
const { LoggingWinston } = require('@google-cloud/logging-winston');

const transports = [];

if (process.env.NODE_ENV === 'production') {
	const gcloudLogging = new LoggingWinston();
	transports.push(gcloudLogging);
} else {
	transports.push(new winston.transports.Console({
		format: winston.format.simple(),
	}));
}

// Create a Winston logger that streams to Stackdriver Logging
// Logs will be written to: "projects/YOUR_PROJECT_ID/logs/winston_log"
const logger = winston.createLogger({
	level: 'info',
	transports,
});

module.exports = logger;
