Package.describe({
  name: 'telescope:users',
  summary: 'Telescope permissions.',
  version: '0.25.7',
  git: "https://github.com/TelescopeJS/Telescope.git"
});

Package.onUse(function (api) {

  api.versionsFrom(['METEOR@1.0']);

  api.use([
    'telescope:core@0.25.7'
  ]);

  api.use([
    'telescope:notifications@0.25.7'
  ], ['client', 'server'], {weak: true});

  api.addFiles([
    // 'package-tap.i18n',
    'lib/collection.js',
    'lib/roles.js',
    'lib/config.js',
    'lib/permissions.js',
    'lib/callbacks.js',
    'lib/helpers.js',
    'lib/published_fields.js',
    'lib/methods.js'
  ], ['client', 'server']);

  api.addFiles([
    'lib/server/publications.js',
    'lib/server/create_user.js',
    'lib/server/notifications/routes.js',
    'lib/server/notifications/templates.js'
  ], ['server']);

  api.addAssets([
    'lib/server/notifications/templates/emailAccountApproved.handlebars',
    'lib/server/notifications/templates/emailNewUser.handlebars'
  ], ['server']);

  // var languages = ["ar", "bg", "cs", "da", "de", "el", "en", "es", "et", "fr", "hu", "id", "it", "ja", "kk", "ko", "nl", "pl", "pt-BR", "ro", "ru", "sl", "sv", "th", "tr", "vi", "zh-CN"];
  // var languagesPaths = languages.map(function (language) {
  //   return "i18n/"+language+".i18n.json";
  // });
  // api.addFiles(languagesPaths, ["client", "server"]);
  
  api.export('Users');

});