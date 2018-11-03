require('dotenv').config();
const sheets = require('./src/controllers/sheets');
const Sync = require('./src/controllers/sync')

const sync = new Sync();

async function run() {
	const rows = await sheets.fetchRows(22).catch(console.error);
	let completed = 0;

	try {
		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];

			console.log(`*** Syncing ${row.hostname}'s guest ${row.participantname} (from conversation on ${row.conversationdate})`);
			// eslint-disable-next-line no-await-in-loop
			await sync.syncGuest(row);
			completed += 1;
		}
	} finally {
		console.log(`** ${completed} of ${rows.length} synced **`);
	}
}

run().catch(console.error);
