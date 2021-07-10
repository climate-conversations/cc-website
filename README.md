# Climate Conversations Website & Portal

This project is all the code that supports the Raisely website and the volunteer portal.

Both websites are built on Raisely, so it's worth familiarising yourself with the
[Support](https://support.raisely.com/) and [Developer](https://developers.raisely.com/) documentation for Raisely.
In particular how API requests work and [errors are handled](https://developers.raisely.com/docs/error-handling) will help you with
diagnosing issues, as well as understanding [custom components](https://components.raisely.com/?path=/docs/introduction--page).

## Contents

Introduction
Useful documentation

## Quick Start

This is a monorepo, most of the time you'll be working in one of
For best experience, you should be using node 14 for local development and VSCode.

See the README's for the subfolders for getting started with each subsystem

[Custom React Components](cc-raisely-components/README.md)
[Authentication Proxy](cc-proxy/README.md)
[Data Synchronisation](conversation-sync/README.md)

Custom React Components - React components that can be placed in the website.
Proxy Cloud Functions - Proxy certain requests to the Raisely API to transform or enhance them
Data Synchronisation Functions - Cloud Functions to synchronise data to other systems

System documentation that will help you understand how it all fits together:

[Overview of Records and their relationship](https://docs.google.com/presentation/d/1ckIDj08RUndWtL7--Y3zOVklLankSawo1I7t2WHjrzo/edit#slide=id.g5ce15420a9_0_105)
[Description of Custom Fields](https://docs.google.com/spreadsheets/d/10AyEaVRdsHoQYZCrC7GpFpLAQFLMpX0B955UMJx7rOo/edit#gid=63860934)
[Summary of Custom Messages](https://docs.google.com/spreadsheets/d/137Kr6hrehSk6LgTC3Lf0U_DeKQHYS7rFvM5zxr7FkSQ/edit#gid=1219904281)
