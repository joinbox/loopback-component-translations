

class LanguageHeaderParser {
    static parse(options = {}) {
        this.options = options;

        return function(req, res, next) {
            if (!req.headers || !req.headers['accept-language']) {
                return next();
            }

            req.parsedHeaders = req.parsedHeaders || {};
            req.parsedHeaders['accept-language'] = LanguageHeaderParser
                .parseRFCPrioritizedHeader(req.headers['accept-language']);

            return next();
        }
    }

    /**
     *  Parses request forms and assignes properties files and fileds to the
     *  body object,
     *
     * @param  {String} headerText The Header content to parse
     * @return {Objects}           The parsed header
     */
    static parseRFCPrioritizedHeader(headerText) {
        return headerText
            .split(/\s*,\s*/gi)
            .map((item) => {
                const parsed = /([a-z]{2}|[\*]{1})-?([a-z]{2})?(?:\s*;\s*q\s*=\s*([0-9\.]+))?/gi.exec(item);
                if (!parsed) return null;

                return {
                    language: (parsed[1] || '').toLowerCase().trim(),
                    country: (parsed[2] || '').toLowerCase().trim(),
                    priority: parsed[3] ? parseFloat(parsed[3]) : 1,
                };
            })
            .filter(item => item !== null)
            .sort((a, b) => (a.priority < b.priority ? 1 : -1));
    }

}

module.exports = LanguageHeaderParser;
