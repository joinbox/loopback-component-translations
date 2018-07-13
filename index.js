const TranslationHandler = require('./src/TranslationHandler');

module.exports = function(app, optionsToMerge) {
    function getDefaultOptions() {
        return {
            defaultAcceptHeader: { language: 'en', country: 'gb', priority: 1 },
        };
    }

    const options = getDefaultOptions();
    Object.assign(options, optionsToMerge);

    const handler = new TranslationHandler({ app, options });
    handler.registerTranslationHooks();
};
