## Climate Conversations Custom Components for Raisely

Custom components developed for use on the Climate Conversations
Raisely sites.

The custom components contained here are used in the campaigns `climate-conversations-2019` and `cc-volunteer-portal`

### Quick start

These components are tested on node 14

Components and styles are most easily edited using the text/code editor of your choice and
using the [Raisely CLI](https://github.com/raisely/cli) to sync file changes.

```sh
# Change to this subdirectory
cd cc-raisely-components

# Install dependencies
npm install

# Set up the raisely client
# If your account has access to multiple organisations, make sure
# you're switched into the Climate Conversations Staging organisation
# before you start.
#
# You will be asked for login details for raisely, and
# to select which campaign styles to work on
npx raisely init

# Start the sync agent and start editing
npx raisely start
```

### Testing

There are a handful of tests for utility components

```
# Run all tests
npx test

# Run a specific test
npx mocha components/<folder>
```

### Debugging

To identify the component you need to debug, there are two ways you can identify it: from the admin or from the client (live site)

##### In the admin

1. Open the page list for the campaign (eg https://admin.raisely.com/campaigns/cc-volunteer-portal/pages)
2. Open the relevant page in the editor
3. Hover over the component you want to debug, and click the cog
4. At the top of the settings panel is the title of the component (call this {title})
5. The corresponding source code should be in ./components/{name}/{name}.js

{name} should be the running the title from step 4 through `_.kebabCase()`

##### In the client

1. Install the React extension for your browser
2. Open the page
3. Open the React Inspector, use the selection pointer to click on the component in the page

The name of the selected component will be the name as used in the source code, so you can find it with

```sh
grep -i NAME components/*/*.js
```
