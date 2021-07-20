const fs = require('fs/promises');
const path = require('path');

const requestNative = require('request-promise-native');
const _ = require('lodash');

const raiselyUrl = 'https://api.raisely.com/v3';

/**
 *
 * @param {string} options.path Path to send request to (eg /users)
 * @param {string|object} options.query
 * @param {object} options.body
 */
async function raisely(options) {
	const token = process.env.APP_TOKEN;

	const internalOptions = ['path', 'query'];

	const uri = `${raiselyUrl}${options.path}`;

	const headers = {
		'User-Agent': 'Component Sync Util',
		// Pass through original authorization if the user is not escalated
		Authorization: `Bearer ${token}`,
	};

	const requestOptions = {
		qs: options.query,
		..._.omit(options, internalOptions),
		uri,
		headers,
		json: true,
	};

	const method = requestOptions.method && requestOptions.method.toLowerCase();
	if (!method || ['get', 'delete'].includes(method))
		delete requestOptions.body;

	const request = requestNative;
	const result = request(requestOptions);

	return result;
}

async function syncComponents() {
	const componentsDir = './components';

	console.log('Loading list of components to sync...');
	const [raiselyComponentsResponse, localComponents] = await Promise.all([
		raisely({
			method: 'GET',
			path: '/components?private=1&limit=1000',
		}),
		fs.readdir(componentsDir),
	]);

	const raiselyComponents = raiselyComponentsResponse.data;

	const remotePaths = raiselyComponents.map((c) => c.name);

	const missingLocal = _.difference(remotePaths, localComponents);
	const newComponents = _.difference(localComponents, remotePaths);

	// Sync all components and new components
	const toSync = [
		...newComponents,
		..._.intersection(localComponents, remotePaths),
	];

	console.log(`There are ${toSync.length} components to upload`);
	if (newComponents.length) {
		console.log(
			`The following ${
				newComponents.length
			} new components will be created:`
		);
		newComponents.forEach((c) => console.log(`	${c}`));
	}
	if (missingLocal.length) {
		console.log(
			`The following ${
				missingLocal.length
			} components are not present locally and will not be updated`
		);
		missingLocal.forEach((c) => console.log(`	${c}`));
	}

	console.log('Starting sync ...');

	let errorCount = 0;
	for (let i = 0; i < toSync.length; i++) {
		const name = toSync[i];
		const uuid = raiselyComponents.find((c) => c.name === name).uuid;
		try {
			const [componentScript, componentConfigString] = await Promise.all([
				fs.readFile(
					path.join(componentsDir, name, `${name}.js`),
					'utf8'
				),
				fs.readFile(
					path.join(componentsDir, name, `${name}.json`),
					'utf8'
				),
			]);

			const componentConfig = JSON.parse(componentConfigString);

			if (newComponents.includes(name)) {
				console.log(`Creating ${name}`);
				console.log('TODO');
				// await raisely({
				// 	method: 'POST',
				// 	path: '/components',
				// 	body: {
				// 		data: {
				// 			name,
				// 			latestHtml: componentScript,
				// 			latestSchema: {
				// 				...component.data.latestSchema,
				// 				data: {
				// 					...component.data.latestSchema.data,
				// 					editable: config.fields
				// 				}
				// 			},
				// 		},
				// 	},
				// });
			} else {
				const existingComponent = await raisely({
					method: 'GET',
					path: `/components/${uuid}`,
				});

				const data = {};

				if (existingComponent.data.latestHtml !== componentScript)
					data.latestHtml = componentScript;

				// Don't consider config different if the only difference is the version
				delete componentConfig.fields.version.value;
				delete existingComponent.data.latestSchema.data.editable.version
					.value;

				if (
					JSON.stringify(componentConfig.fields) !==
					JSON.stringify(
						existingComponent.data.latestSchema.data.editable
					)
				) {
					data.latestSchema = {
						...existingComponent.data.latestSchema,
						data: {
							...existingComponent.data.latestSchema.data,
							editable: componentConfig.fields,
						},
					};
				}

				// If there are changes
				if (Object.keys(data).length) {
					console.log(`Updating ${name}`);

					if (!data.latestSchema) {
						data.latestSchema = {
							...existingComponent.data.latestSchema,
							data: {
								...existingComponent.data.latestSchema.data,
								editable: componentConfig.fields,
							},
						};
					}

					data.latestVersion =
						existingComponent.data.latestVersion + 1;
					await raisely({
						method: 'PATCH',
						path: `/components/${uuid}`,
						body: {
							data,
						},
					});
				} else {
					console.log(`Skipping ${name} (no change)`);
				}
			}
		} catch (e) {
			console.error(`Could not sync component ${name}`, e.error || e);
			errorCount += 1;
		}
	}

	if (errorCount)
		throw new Error(`${errorCount} errors occurred while syncing.`);
}

syncComponents().catch((e) => {
	console.error(e);
	process.exit(-1);
});
