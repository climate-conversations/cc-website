/**
  * Google Cloud Functions does not provide any kind of cron, so
  * this is a simple app engine that will run retry's for the
  * controllers
  */
const cronEngine = require('airblast/cronEngine');
const retries = require('./retries');

cronEngine.start(retries);
