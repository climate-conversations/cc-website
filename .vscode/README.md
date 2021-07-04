## Climate Conversations Website & Volunteer portal

This is the code for Raisely custom components and supporting cloud functions for the website and
volunteer portal.

This is a mono-repo, most of the time you'll be working in one of the subdirectories

By default, all local commands run against the Staging organisation.
Create a Pull Request to get them into production

## cc-raisely-components

To edit custom components

```
cd cc-raisely-components
npm install
npx raisely start
```

There are a handful of tests for utility components

```
npm test
```

# cc-proxy

Cloud function to proxy requests and escalate privileges where necessary

Make sure test pass before submitting a PR

```
cd cc-proxy
npm install
npm test
```

## conversation-sync

Cloud functions that respond to webhooks to perform synchronisation

```
cd conversation-sync
npm install
npm test
```

You can test some of the spreadsheet syncs against an actual google sheet
by using (for example)

```
LIVE_TEST=1 npx mocha ./test/controllers/BackendReportController.test.js
```
