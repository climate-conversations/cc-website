require('dotenv').config();

const { handler } = require('./helpers/middleware');
const Sync = require('./controllers/sync');

const syncController = new Sync();

exports.receiveGuest = handler(syncController, true);

exports.syncGuest = syncController.syncGuest;
