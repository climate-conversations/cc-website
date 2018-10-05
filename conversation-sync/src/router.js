const { handler } = require('./helpers/middleware');
const Sync = require('./controllers/sync');

exports.receiveGuest = handler(Sync, true);

exports.syncGuest = Sync.syncGuest;
