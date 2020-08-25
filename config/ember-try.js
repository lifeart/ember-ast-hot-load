"use strict";

module.exports = async function (urls) {
  return {
    useYarn: true,
    scenarios: [
      {
        name: "ember-lts-3.12",
        npm: {
          devDependencies: {
            "ember-source": "~3.12.0",
          },
        },
      },
      {
        name: "ember-lts-3.16",
        npm: {
          devDependencies: {
            "ember-source": "~3.16.0",
          },
        },
      },
      {
        name: "ember-release",
        npm: {
          devDependencies: {
            "ember-source": urls[0],
          },
        },
      },
      {
        name: "ember-beta",
        npm: {
          devDependencies: {
            "ember-source": urls[1],
          },
        },
      },
      {
        name: "ember-canary",
        npm: {
          devDependencies: {
            "ember-source": urls[2],
          },
        },
      },
      {
        name: "ember-default-with-jquery",
        env: {
          EMBER_OPTIONAL_FEATURES: JSON.stringify({
            "jquery-integration": true,
          }),
        },
        npm: {
          devDependencies: {
            "@ember/jquery": "^0.5.1",
          },
        },
      },
      {
        name: "ember-classic",
        env: {
          EMBER_OPTIONAL_FEATURES: JSON.stringify({
            "application-template-wrapper": true,
            "default-async-observers": false,
            "template-only-glimmer-components": false,
          }),
        },
        npm: {
          ember: {
            edition: "classic",
          },
        },
      },
    ],
  };
};
