const AppError = require('./errors.js');

const AUTH_TOKEN = process.env.AUTH_SECRET;

function handler(controller) {
	return async function handlerFn(req, res) {
		try {
			res.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT');
			res.set('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers');

			const auth = req.headers.authorization || req.headers.Authorization;

			if (!auth || auth !== `Bearer ${AUTH_TOKEN}`) {
				throw new AppError(401, 'unauthorized', 'The authorization token provided is not valid.');
			}

			const result = await controller[req.method.toLowerCase()](req);

			res.status(result.status).send(result.body);
		} catch (error) {
			console.error(error.stack);
			res.status(error.status || 500).send(error.body);
		}
	};
}

module.exports = { handler };
