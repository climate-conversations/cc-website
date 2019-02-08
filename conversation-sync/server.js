// require('./config');
// const routes = require('./config/routes');

console.log('Environment:')
Object.keys(process.env).forEach(key => console.log(`${key} ${process.env[key]}`));
console.log(process.env);

module.exports = {};

routes.forEach((route) => { module.exports[route.path] = route.fn; });
