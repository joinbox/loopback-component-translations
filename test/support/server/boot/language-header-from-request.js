const TranslationsUtil = require('../../../../src/util/TranslationsUtil.js');

module.exports = function(app) {
    TranslationsUtil.registerLanguageParsingPhase(app);
};
