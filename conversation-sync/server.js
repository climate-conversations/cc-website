console.log(process.env)

require('./config');
const routes = require('./config/routes');

Object.keys(process.env).forEach(key => console.log(`${key} ${process.env[key]}`));

module.exports = {};

routes.forEach((route) => { module.exports[route.path] = route.fn; });
