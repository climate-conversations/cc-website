const _ = require('lodash');

const GoogleDriveLoader = require('../../src/services/driveProvider');
const MockClass = require('./mockClass');

class MockDrive extends MockClass {
	constructor() {
		super();
		this.files = {
			create: ({ auth, resource, media, fields }) => {
				this.logCall('files.create', resource, _.pick(media, ['mediaType']));
				return {
					data: {
						id: 'a fake id',
						name: resource.name,
					}
				};
			}
		}
	}
}

const google = {
	auth: {
		JWT: class MockJwt extends MockClass { authorize() {} },
	}
}

/**
 * @param {Sandbox} sandbox sinon sandbox to stub the loader within
 * @returns {{ google, drive }} Mocked google and drive
 */
function mockDrive(sandbox) {
	const mockedDrive = new MockDrive();

	sandbox.stub(GoogleDriveLoader, 'load').callsFake(() => {
		console.log('Fake drive api loaded');
		return { google, drive: mockedDrive };
	});
	return mockedDrive;
}

module.exports = mockDrive;
