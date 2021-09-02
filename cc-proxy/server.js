const express = require('express');
const functions = require('./src');

const app = express();
app.use(express.json());
const port = process.env.PORT || 3501;

app.get('/', (req, res) => {
	res.send('Local cloud functions');
});

const methods = [
	// Listen for all HTTP request types
	'head',
	'get',
	'post',
	'patch',
	'delete',
	'options',
];

Object.keys(functions).forEach((name) => {
	const fnPath = `/${name}`;
	const wildPath = `/${name}*`;
	methods.forEach((method) => {
		app[method](wildPath, (req, res) => {
			// Drop the function name from the url
			const fullUrl = req.originalUrl.split('/').filter((x) => x);
			fullUrl.shift();
			req.originalUrl = `/${fullUrl.join('/')}`;
			return functions[name](req, res);
		});
	});
	console.log(fnPath);
});

methods.forEach((method) => {
	app[method]('*', (req, res) =>
		console.error(
			`Unknown request ${method.toUpperCase()} ${req.originalUrl}`
		)
	);
});

app.listen(port, () => {
	console.log(
		`cc-proxy cloud functions listening at http://localhost:${port}`
	);
});
