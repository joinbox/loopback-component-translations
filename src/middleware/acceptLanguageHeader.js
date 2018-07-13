

class LanguageHeaderParser {
    parse(req, res, next) {
        if (req.headers && req.headers['accept-language']) {
            req.parsedHeaders = req.parsedHeaders || {};
            req.parsedHeaders['accept-language'] = this
                .parseRFCPrioritizedHeader(req.headers['accept-language']);
        }

        return next();
    }

    parseLanguageHeader(header) {
        return /^(?:(\*)|(?:([a-z]{2,3})(?:[-_]([a-z]{2,3}))?))(?:;\s*q\s*=\s*((1|0)(\.[0-9]{1,2})?))?$/i.exec(header);
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
                const parsed = this.parseLanguageHeader(item);
                if (!parsed) return null;

                return {
                    language: (parsed[2] || parsed[1]).toLowerCase(),
                    country: (parsed[3] || '').toLowerCase(),
                    priority: parsed[4] ? parseFloat(parsed[4], 10) : 1,
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
