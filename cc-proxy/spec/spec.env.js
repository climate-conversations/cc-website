const chai = require('chai');
const chaiSubset = require('chai-subset');

chai.use(chaiSubset);

// Set test environment
process.env.NODE_ENV = 'test';
process.env.APP_TOKEN = 'MOCK_APP_TOKEN';

