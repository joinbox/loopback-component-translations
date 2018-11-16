const LanguageHeaderParser = require('../../../../src/parser/LanguageHeaderParser.js');

module.exports = function(app) {
    app.remotes().phases
        .addBefore('invoke', 'headers-from-request')
        .use((ctx, next) => {

            if (ctx.req.headers && ctx.req.headers['accept-language']) {

                ctx.args.options.parsedHeaders = ctx.args.options.parsedHeaders || {};
                ctx.args.options.parsedHeaders['accept-language'] = LanguageHeaderParser
                    .parseRFCPrioritizedHeader(ctx.req.headers['accept-language']);
            }

            return next();
        });
};
