/**
 * Local rendering test server
 * Google Cloud Documentation says it uses Express Compatible code.
 */

const PORT = process.env.PORT || 5555;

const render = require('./server');
const bp = require('body-parser');
const app = require('express')();

// set up json parsing
app.use(bp.json());

// map out endpoints
const endpoints = Object.keys(render);
endpoints.forEach(e => app.all(`/${e}`, render[e]));

app.listen(PORT);
console.log(`
Cloud function on port ${PORT}

Available REST endpoints:

${endpoints.map(e => `http://localhost:${PORT}/${e}`)
	.join('\n')}`)
