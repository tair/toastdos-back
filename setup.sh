#!/bin/bash
npm install && \
node ./scripts/generate_orcid_file.js && \
node ./scripts/gen_jwt_keys.js && \
npm run migrate && \
npm run seed && \
npm run import go && \
npm run import po && \
npm run import eco && \
echo "Setup complete, you must update config files."
