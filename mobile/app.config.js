const appConfig = require('./app.json');

function positiveIntegerFromEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

const base = appConfig.expo;
const androidVersionCode = positiveIntegerFromEnv(
  'ANDROID_VERSION_CODE',
  base.android.versionCode,
);
const iosBuildNumber = String(
  positiveIntegerFromEnv('IOS_BUILD_NUMBER', Number(base.ios.buildNumber)),
);

module.exports = {
  ...base,
  ios: {
    ...base.ios,
    buildNumber: iosBuildNumber,
  },
  android: {
    ...base.android,
    versionCode: androidVersionCode,
  },
};
