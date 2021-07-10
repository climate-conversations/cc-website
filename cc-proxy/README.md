## Proxy Cloud functions

Cloud function to proxy requests and escalate privileges where necessary

Make sure test pass before submitting a PR

```
cd cc-proxy
cp .env.EXAMPLE .env
npm install
npm test
```

# Deploying

When this is pushed to a branch it will automatically deploy to the staging environment (assuming tests pass)
However waiting for all functions to deploy can take some time, if you wish to deploy and test just one
function, it might be easier to deploy from local using one of the `deploy:` commands in `package.json`

eg:

```
gcloud config set project cc-website-staging
deploy:proxy
```

TODO
It is possible to run the functions locally so you can iterate faster if you need to
test against live React components.

How to ...
