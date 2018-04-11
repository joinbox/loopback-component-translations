const Microservice = require('@joinbox/loopback-microservice');

const MicroserviceError = Microservice.Error;

/**
 * Registers REST-Hooks for POST, PATCH, DELETE and GET methods.
 * The hooks are registerd based on the model configurations.
 * See the readme for detailed information about the configuration.
 * The hooks are handlng the CRUD actions for a given entities translations
 * Translations need to be provided as an array on the property `translations'
 *
 * @type {Class}
 */
module.exports = class TranslationHandler {
    constructor({ app, options }) {
        this.app = app;
        this.options = options;
    }

    /**
     * Register loopback hooks to handle translations
     *
     * @return {void}
     */
    registerTranslationHooks() {
        Object.values(this.app.models).forEach((model) => {
            const translationConfig = model.definition.settings.relations ?
                model.definition.settings.relations.translations : null;

            if (translationConfig) {
                if (typeof model.registerHook !== 'function') {
                    throw new MicroserviceError(`The model ${model.modelName},
                        for wich you are using translations provided by the
                        module 'loopback-comonent-translations' does not have a
                        registerHook function. This usually means you did not
                        extend the LoopbackModelBase Class in your model.js`);
                }

                // Note: The registered function will have the model class scope

                // POST - Create translations
                model.registerHook('beforeRemote', 'create', this.prepareRequestData, this);
                model.registerHook('afterRemote', 'create', this.createTranslations, this);

                // PATCH - Update translations
                model.registerHook('beforeRemote', 'patchOrCreate', this.updateTranslations, this);
                model.registerHook('beforeRemote', 'prototype.patchAttributes', this.updateTranslations, this);

                // DELETE - Delete translations
                model.registerHook('beforeRemote', 'deleteById', this.deleteTranslations);

                // GET
                // - Propagate translations to the model instance
                // - Handle fall-back
                // - Implement Search logic
                model.registerHook('afterRemote', 'find', this.propagateTranslations, this);
                model.registerHook('afterRemote', 'findById', this.propagateTranslations, this);
                model.registerHook('afterRemote', 'findOne', this.propagateTranslations, this);
            }
        });
    }

    /**
     * Save the original request to the context and remove all translation data
     * so the entity can be persisted in strict mode
     *
     * @param  {Object}  ctx the request context
     * @return {Boolean}     stops the middle ware chain if true
     */
    async prepareRequestData(ctx) {
        const { translations } = this.loopbackModel.definition.settings;

        // Case no translations
        if (!translations) {
            return false;
        }

        const originalData = ctx.args.data;
        const preparedData = {};

        const modelPropperties = this.loopbackModel.definition.properties;

        Object.keys(modelPropperties).forEach((property) => {
            if (!translations.includes(property) && originalData[property] !== undefined) {
                preparedData[property] = originalData[property];
            }
        });

        ctx.args.data = preparedData;
        ctx.args.originalData = originalData;

        // call next after the async function
        return false;
    }

    /**
     * Create the given translations and link them to the created entity
     *
     * @param  {Object}  ctx the request context
     * @param  {Object}  instance loopback entity instance
     * @return {Promise}     stops the middle ware chain if true
     */
    async createTranslations(ctx, instance, translationHandlerContext) {
        // No Translations
        const data = ctx.args.originalData;
        if (!data.translations) {
            return false;
        }

        if (!this.loopbackModel.definition.settings.relations.translations) {
            return new MicroserviceError('You do not have a translation configuration in your models relations!', { status: 406 });
        }

        const translationConfig = this.loopbackModel.definition.settings
            .relations.translations;

        translationHandlerContext.checkForDuplicatedLocales(data.translations);

        const translationsToCreate = data.translations.map((translation) => {
            const translationToCreate = translation;
            translationToCreate[translationConfig.foreignKey] = instance.id;

            return translationToCreate;
        });

        await this.loopbackModel.app.models[translationConfig.model]
            .create(translationsToCreate);

        // don't stop the Middleware chain; Call the next function from the
        // original hook
        return false;
    }

    /**
     * Update the given translations and remove form the request data
     *
     * @param  {Object}  ctx the request context
     * @return {Promise}     stops the middle ware chain if true
     */
    async updateTranslations(ctx, instance, translationHandlerContext) {
        const originalData = ctx.args.data;
        const translationConfig = this.loopbackModel.definition.settings
            .translations;
        const translationRelationConfig = this.loopbackModel.definition
            .settings.relations.translations;
        const modelPropperties = this.loopbackModel.definition.properties;
        const preparedData = {};

        // No Translations
        if (!originalData.translations || !translationRelationConfig) {
            return false;
        }

        translationHandlerContext.checkForDuplicatedLocales(originalData.translations);

        // Update request data to be a valid model instance in strict mode
        Object.keys(modelPropperties).forEach((property) => {
            if (!translationConfig.includes(property) && originalData[property]) {
                preparedData[property] = originalData[property];
            }
        });
        ctx.args.data = preparedData;
        ctx.args.originalData = originalData;

        // shorthand for the relationModel upsert function
        const relationModel = this.loopbackModel.app.models[translationRelationConfig.model];

        // Update all translations, errors will be catched by the registerHook
        // function
        await Promise.all(originalData.translations
            .map(translation => relationModel.upsert(translation)));

        // don't stop the Middleware chain; Call the next function from the
        // original hook
        return false;
    }

    /**
     * Delete all related translations for a given record
     *
     * @param  {Object}  ctx the request context
     * @return {Promise}     stops the middle ware chain if true
     */
    async deleteTranslations(ctx) {
        const translationRelationConfig = this.loopbackModel.definition
            .settings.relations.translations;
        await this.loopbackModel.app.models[translationRelationConfig.model]
            .destroyAll({ [translationRelationConfig.foreignKey]: ctx.args.id });
    }

    async propagateTranslations(ctx, instance, translationHandlerContext = {}) {
        // Nothing to propagate if no language is accepted
        if (!ctx.req.parsedHeaders || !ctx.req.headers['accept-language']) {
            return;
        }
        const hasMultipleResults = instance instanceof Array;

        const translationConfig = this.loopbackModel.definition.settings
            .translations;
        const translationRelationConfig = this.loopbackModel.definition
            .settings.relations.translations;
        const translationsFilter = {
            order: 'locale_id ASC'
        };
        translationsFilter.where = hasMultipleResults ? {} : {
            [translationRelationConfig.foreignKey]: instance.id
        };
        const modelTranslations = await this.loopbackModel.app
            .models[translationRelationConfig.model]
            .find(translationsFilter);
        const localesFilter = this.loopbackModel.app.models.Locale
            .definition.settings.relations.language ?
            { include: ['language', 'country'] } : {};
        const locales = await this.loopbackModel.app
            .models.Locale.find(localesFilter);
        const preparedLocales = locales.map((locale) => {
            const result = locale.toJSON();
            result.locale = `${locale.language['iso-2-char']}-${locale.country.short}`.toLowerCase();

            return result;
        });
        const { options } = translationHandlerContext;
        if (ctx.req.headers['accept-language'] && !ctx.req.parsedHeaders['accept-language']) {
            throw new MicroserviceError(`Accept-Language Header not parsed.
                Please register the headerParser Middleware served with the
                package 'loopback-comonent-translations', read the package
                readme for further instructions.`);
        }
        const acceptHeaders = ctx.req.parsedHeaders['accept-language'];
        acceptHeaders.push(options.defaultAcceptHeader);

        if (hasMultipleResults) {
            instance.forEach((entity) => {
                const translation = translationHandlerContext
                    .getFallbackTranslation({
                        acceptHeaders: [...acceptHeaders],
                        translations: modelTranslations.filter(translation =>
                            translation[translationRelationConfig.foreignKey]
                            === entity.id),
                        locales: preparedLocales,
                    });

                translationConfig.forEach((translatedProperty) => {
                    // eslint-disable-next-line no-param-reassign
                    entity[translatedProperty] = translation[translatedProperty] ?
                        translation[translatedProperty] : '';
                });
            });
        } else {
            const translation = translationHandlerContext
                .getFallbackTranslation({
                    acceptHeaders: [...acceptHeaders],
                    translations: modelTranslations,
                    locales: preparedLocales,
                });

            translationConfig.forEach((translatedProperty) => {
                // eslint-disable-next-line no-param-reassign
                instance[translatedProperty] = translation[translatedProperty] ?
                    translation[translatedProperty] : '';
            });
        }
    }

    getFallbackTranslation({ translations, acceptHeaders, locales }) {
        const searchHeader = acceptHeaders.shift();
        let locale;

        if (searchHeader.language !== '' && searchHeader.country !== '') {
            // Header has a locale specified
            locale = locales.find((searchLocale) => {
                return searchLocale.country.short.toLowerCase() === searchHeader.country &&
                searchLocale.language['iso-2-char'].toLowerCase() === searchHeader.language
            });
        } else if (
            // Header has a language specified
            searchHeader.language !== '' &&
            searchHeader.language !== '*' &&
            searchHeader.country === ''
        ) {
            locale = locales.find((searchLocale) => {
                return searchLocale.language['iso-2-char'].toLowerCase() === searchHeader.language &&
                searchLocale.default === true;
            });
        } else {
            // Header has * specified, parsed as language
            // Simply use the first translation
            locale = locales.find((searchLocale) => {
                if (translations[0]) {
                    return searchLocale.id === translations[0].locale_id;
                }

                return false
            });
        }

        const translation = (locale) ? translations
            .find(trans => trans.locale_id === locale.id) : false;

        if (translation) {
            // Hit return translation
            return translation;
        } else if (acceptHeaders.length === 0) {
            // No more locales to search, no translation found
            return {};
        }

        // Check the next translation in the fall-back chain
        return this.getFallbackTranslation({ translations, acceptHeaders, locales });
    }

    /**
     * Check if multiple translations have the same locale_id
     *
     * @param  {Array} translations An array with transaltion objects
     * @return {void}
     */
    checkForDuplicatedLocales(translations) {
        const usedLocales = [];
        translations.forEach((translation) => {
            if (usedLocales.includes(translation.locale_id)) {
                throw new MicroserviceError(`Translation for locale already
                    exists. This means you are triing to save multiple translations
                    with the same locale.`, translation);
            }
            usedLocales.push(translation.locale_id);
        });
    }
};
