

class LanguageHeaderParser {
    parse(req, res, next) {
        if (req.headers && req.headers['accept-language']) {
            req.parsedHeaders = req.parsedHeaders || {};
            req.parsedHeaders['accept-language'] = this
                .parseRFCPrioritizedHeader(req.headers['accept-language']);
        }

        return next();
    }

    /**
     *  Parses request forms and assignes properties files and fileds to the
     *  body object,
     *
     * @param  {String} headerText The Header content to parse
     * @return {Objects}           The parsed header
     */
    // eslint-disable-next-line class-methods-use-this
    parseRFCPrioritizedHeader(headerText) {
        return headerText
            .split(/\s*,\s*/gi)
            .map((item) => {
                // eslint-disable-next-line no-useless-escape
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

const parser = new LanguageHeaderParser();
module.exports = {
    parse: () => parser.parse.bind(parser),
};
