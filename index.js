const TranslationHandler = require('./src/TranslationHandler');

module.exports = function(app, optionsToMerge) {
    const defaultOptions = {
        defaultAcceptHeader: { language: 'en', country: 'gb', priority: 1 },
    };
    const options = Object.assign({}, defaultOptions, optionsToMerge);

    const handler = new TranslationHandler({ app, options });
    handler.registerTranslationHooks();
};
