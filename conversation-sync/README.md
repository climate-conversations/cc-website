## Synchonisation service for Climate Conversations
Syncs raisely events to:
- Mailchimp
- Conversation Survey Backend Spreadsheet
- Cash Donations Spreadsheet

## Handling Mailchimp Unsubscribes
For compiance reasons, Mailchimp makes it harder to re-subscribe someone once they're off the list.

When adding someone to the list, the system should check:
- Are they already on the list?
- If their status is '' set their status to 'subscribed'

- If subscribing gives an error that they have been forgotton, you'll need to set their status to 'pending'
  to have mailchimp send a resubscribe email to them
