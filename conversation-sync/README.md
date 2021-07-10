## Synchonisation service for Climate Conversations

Syncs raisely events to:

-   Mailchimp
-   Conversation Survey Backend Spreadsheet
-   Cash Donations Spreadsheet
-   Photos to Google Drive

## Handling Mailchimp Unsubscribes

For compiance reasons, Mailchimp makes it harder to re-subscribe someone once they're off the list.

When adding someone to the list, the system should check:

-   Are they already on the list?
-   If their status is '' set their status to 'subscribed'

-   If subscribing gives an error that they have been forgotton, you'll need to set their status to 'pending'
    to have mailchimp send a resubscribe email to them

## Handling of Donations

All donations are stored on the main website campaign so as to

1. Keep a steady flow of activity on the donatins page to create social proof
2. Keep administration of donations and donors in one place

This is facilitated by:

1. Offline donations created in the portal are assigned to the portal
2. A donation sync cloud function moves those donations to the website campaign
3. Any process that counts/sums donations looks on the campaign

# Testing locally

```
cd conversation-sync

# Set up the environment
cp .env.EXAMPLE .env
npm install
npm test
```

# Testing against real spreadsheets

You can test some of the spreadsheet syncs against an actual google sheet.
To do so, you'll need to download service account credentials and place them in
`./conversation-sync-cred.json` and update your `.env` file to point
to that file for credentials.

then run with the `LIVE_TEST` flag.

```
# Download credentials for the serv
LIVE_TEST=1 npx mocha ./test/controllers/BackendReportController.test.js
```
