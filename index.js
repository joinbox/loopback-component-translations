const TranslationHandler = require('./src/TranslationHandler.js');
const LanguageHeaderParser = require('./src/parser/LanguageHeaderParser.js');
const TranslationsUtil = require('./src/util/TranslationsUtil.js');

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

module.exports.LanguageHeaderParser = LanguageHeaderParser;
module.exports.TranslationsUtil = TranslationsUtil;


