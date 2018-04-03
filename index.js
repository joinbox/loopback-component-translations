const TranslationHandler = require('./src/TranslationHandler');

module.exports = function(app, optionsToMerge) {
    const options = {
        defaultLocale: 'en-gb',
    };
    const handler = new TranslationHandler({ app, options });
    handler.registerTranslationHooks();
};
