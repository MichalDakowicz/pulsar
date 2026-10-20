const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withHealthReminders(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const application = manifest.application[0];
    application.receiver ??= [];
    const name = 'expo.modules.notifications.service.NotificationsService';
    application.receiver = application.receiver.filter((receiver) => receiver.$['android:name'] !== name);
    application.receiver.push({ $: { 'android:name': name, 'tools:node': 'remove' } });
    return mod;
  });
};
