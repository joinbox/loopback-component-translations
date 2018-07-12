const Microservice = require('@joinbox/loopback-microservice');

const MicroserviceError = Microservice.Error;

/**
 * Registers REST-Hooks for POST, PATCH, DELETE and GET methods.
 * The hooks are registerd based on the model configurations.
 * See the readme for detailed information about the configuration.
 * The hooks are handlng the CRUD actions f      or a given entities translations
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
     * Defines the translations as model properties
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
                        for which you are using translations provided by the
                        module 'loopback-component-translations' does not have a
                        registerHook function. This usually means you did not
                        extend the LoopbackModelBase Class in your model.js`);
                }

                const { translations } = model.definition.settings;
                const { modelName } = model;

                if (!Array.isArray(translations)) {
                    throw new MicroserviceError('The translation configuration for the model ' +
                    `${modelName} is not a valid array`);
                }

                // register translatable properties on the loopback model.
                translations.forEach((translationKey) => {
                    // Register the translatable property on the loopback model.
                    model.defineProperty(translationKey, {
                        type: String,
                    });
                });

                // Note: The registered function with registerHook will have the model class scope

                // POST - Create translations
                model.registerHook('beforeRemote', 'create', this.prepareRequestData, this);
                model.registerHook('afterRemote', 'create', this.createTranslations, this);

                // PATCH - Update translations
                model.registerHook('beforeRemote', 'patchOrCreate', this.updateTranslations, this);
                model.registerHook('beforeRemote', 'prototype.patchAttributes', this.updateTranslations, this);

                // DELETE - Delete translations
                model.registerHook('beforeRemote', 'deleteById', this.deleteTranslations);


                // pass the accept header to the operation hook
                model.beforeRemote('find', this.propagateFallback);
                model.beforeRemote('findById', this.propagateFallback);
                model.beforeRemote('findOne', this.propagateFallback);

                // GET
                // - Propagate translations to the model instance
                // - Handle fall-back
                // - Implement Search logic
                model.observe('loaded', this.translate.bind(this));
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

        const modelProperties = this.loopbackModel.definition.properties;

        Object.keys(modelProperties).forEach((property) => {
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
     * Handles the propagation of the translation values to
     * their keys. Uses Class functions to load the translations
     * and locales and to determine the correct fallback for the given
     * accept language header.
     *
     * @param {Object} ctx Current context
     */
    async translate(ctx) {
        if (!ctx.options.parsedHeaders) return;

        const { Model } = ctx;
        const { translations } = Model.definition.settings;
        const acceptLanguages = ctx.options.parsedHeaders['accept-language'];
        const translationRelationConfig = Model.definition.settings.relations.translations;

        const modelTranslations = await this.loadTranslations(Model, ctx.data.id);
        const locales = await this.getLocales(Model);
        const translationValues = await this.getFallbackTranslation({
            acceptHeaders: [...acceptLanguages],
            translations: modelTranslations
                .filter(translation =>
                    translation[translationRelationConfig.foreignKey] === ctx.data.id),
            locales,
        });

        translations.forEach((translationKey) => {
            ctx.data[translationKey] = translationValues[translationKey] || '';
        });

    }

    /**
     * Loads all existing translation data form the database
     * for a given instance
     *
     * @param {Object} Model the loopback model
     * @param {Integer} instanceId the instance id to load the translations fore
     */
    async loadTranslations(Model, instanceId) {
        const translationRelationConfig = Model.definition
            .settings.relations.translations;
        const translationsFilter = {
            order: 'locale_id ASC',
        };
        translationsFilter.where = {
            [translationRelationConfig.foreignKey]: instanceId,
        };

        return Model.app
            .models[translationRelationConfig.model]
            .find(translationsFilter);
    }

    /**
     * Loads and returns the locale data from the database
     *
     * @param {Object} Model the loopback model
     */
    async getLocales(Model) {
        if (this.locales) return this.locales;

        const localesFilter = Model.app.models.Locale
            .definition.settings.relations.language ?
            { include: ['language', 'country'] } : {};
        const locales = await Model.app
            .models.Locale.find(localesFilter);

        this.locales = locales;
        return locales;
    }

    /**
     * Write the paresd headers to the loopback contexts
     * so it can be accessed inside an operation hook
     *
     * @param {Object} ctx
     * @param {Object} instance
     * @param {Function} next
     */
    propagateFallback(ctx, instance, next) {
        // Nothing to propagate if no language is accepted
        if (!ctx.req.parsedHeaders || !ctx.req.headers['accept-language']) {
            return next();
        }

        ctx.args.options.parsedHeaders = ctx.req.parsedHeaders;
        return next();
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

    getFallbackTranslation({ translations, acceptHeaders, locales }) {
        const searchHeader = acceptHeaders.shift();
        let locale;

        if (searchHeader.language !== '' && searchHeader.country !== '') {
            // Header has a locale specified
            locale = locales.find((searchLocale) => {
                return searchLocale.country['iso2'].toLowerCase() === searchHeader.country &&
                searchLocale.language['iso2'].toLowerCase() === searchHeader.language;
            });
        } else if (
            // Header has a language specified
            searchHeader.language !== '' &&
            searchHeader.language !== '*' &&
            searchHeader.country === ''
        ) {
            locale = locales.find((searchLocale) => {
                return searchLocale.language['iso2'].toLowerCase() === searchHeader.language &&
                searchLocale.isDefaultForLanguage === true;
            });
        } else {
            // Header has * specified, parsed as language
            // Simply use the first translation
            locale = locales.find((searchLocale) => {
                if (translations[0]) {
                    return searchLocale.id === translations[0].locale_id;
                }

                return false;
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
     * @param  {Array} translations An array with translation objects
     * @return {void}
     */
    checkForDuplicatedLocales(translations) {
        const usedLocales = [];
        translations.forEach((translation) => {
            if (usedLocales.includes(translation.locale_id)) {
                throw new MicroserviceError(`Translation for locale with the id
                ${translation.locale_id} already exists.
                This means you are trying to save multiple translations
                with the same locale.`, translation);
            }
            usedLocales.push(translation.locale_id);
        });
    }
};
