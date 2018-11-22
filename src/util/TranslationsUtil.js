const LanguageHeaderParser = require('../parser/LanguageHeaderParser.js');

class TranslationsUtil {

    static registerLanguageParsingPhase(app) {
        app.remotes().phases
            .addBefore('invoke', 'headers-from-request')
            .use((ctx, next) => {

                if (ctx.req.headers && ctx.req.headers['accept-language']) {

                    ctx.args.options = ctx.args.options || {};
                    ctx.args.options.parsedHeaders = ctx.args.options.parsedHeaders || {};
                    ctx.args.options.rawHeaders = ctx.args.options.rawHeaders || {};
                    ctx.args.options.rawHeaders['accept-language'] = ctx.req
                        .headers['accept-language'];
                    ctx.args.options.parsedHeaders['accept-language'] = LanguageHeaderParser
                        .parseRFCPrioritizedHeader(ctx.req.headers['accept-language']);
                }

                return next();
            });
    }
}

module.exports = TranslationsUtil;
