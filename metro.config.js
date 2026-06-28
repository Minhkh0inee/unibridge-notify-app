const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
const wsBrowserEntry = path.join(
  path.dirname(require.resolve('ws/package.json')),
  'browser.js'
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if ((platform === 'ios' || platform === 'android') && moduleName === 'ws') {
    return {
      filePath: wsBrowserEntry,
      type: 'sourceFile',
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
