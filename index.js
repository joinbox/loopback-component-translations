const TranslationHandler = require('./src/TranslationHandler');

module.exports = function(app) {
    const handler = new TranslationHandler(app);
    handler.registerTranslationHooks();
};
