const Microservice = require('@joinbox/loopback-microservice');

const MicroserviceError = Microservice.Error;

/**
 * Handels loopback moels ranslations
 *
 * @type {Class}
 */
module.exports = class TranslationHandler {
    constructor({ app, options }) {
        this.app = app;
        this.options = options;
    }

    /**
     * Register loopbakc hooks to handle translations
     *
     * @return {void}
     */
    registerTranslationHooks() {
        Object.values(this.app.models).forEach((model) => {
            const translationConfig = model.definition.settings.relations ?
                model.definition.settings.relations.translations : null;

            if (translationConfig) {
                if (typeof model.registerHook !== 'function') {
                    throw new MicroserviceError(`The model ${model.modelName}
                        you are using translations does not have a registerHook
                        function. This usually means you did not extend the
                        LoopbackModelBase Class in your model.js`);
                }

                // Note: The registerd function will have the model class scope

                // POST - Create translations
                model.registerHook('beforeRemote', 'create', this.prepateRequestData);
                model.registerHook('afterRemote', 'create', this.createTransltions);

                // PATCH - Update translations
                model.registerHook('beforeRemote', 'prototype.patchAttributes', this.updateTranslations);

                // DELETE - Delete translations
                model.registerHook('beforeRemote', 'deleteById', this.deleteTranslations);

                // GET - Propagate translations to the model and handle fallback
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
    async prepateRequestData(ctx) {
        const { translations } = this[this.modelName].definition.settings;

        // Case no translations
        if (!translations) {
            return false;
        }

        const originalData = ctx.args.data;
        const preparedData = {};

        const modelPropperties = this[this.modelName].definition.properties;

        Object.keys(modelPropperties).forEach((property) => {
            if (!translations.includes(property) && originalData[property]) {
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
    async createTransltions(ctx, instance) {
        // No Translations
        const data = ctx.args.originalData;
        if (!data.translations) {
            return false;
        }

        if (!this[this.modelName].definition.settings.relations.translations) {
            return new MicroserviceError('You do not have a translation configuration in your models relations!', { status: 406 });
        }

        const translationConfig = this[this.modelName].definition.settings
            .relations.translations;

        TranslationHandler.checkForDublicatedLocales(data.translations);

        const translationsToCreate = data.translations.map((translation) => {
            const translationToCreate = translation;
            translationToCreate[translationConfig.foreignKey] = instance.id;

            return translationToCreate;
        });

        await this[this.modelName].app.models[translationConfig.model]
            .create(translationsToCreate);

        // call next after the async function
        return false;
    }

    /**
     * Update the given translations and remove form the request data
     *
     * @param  {Object}  ctx the request context
     * @return {Promise}     stops the middle ware chain if true
     */
    async updateTranslations(ctx) {
        const originalData = ctx.args.data;
        const translationConfig = this[this.modelName].definition.settings
            .translations;
        const translationRelationConfig = this[this.modelName].definition
            .settings.relations.translations;
        const modelPropperties = this[this.modelName].definition.properties;
        const preparedData = {};

        // No Translations
        if (!originalData.translations || !translationRelationConfig) {
            return false;
        }

        TranslationHandler.checkForDublicatedLocales(originalData.translations);

        // Update request data to be a valid model instance in strict mode
        Object.keys(modelPropperties).forEach((property) => {
            if (!translationConfig.includes(property) && originalData[property]) {
                preparedData[property] = originalData[property];
            }
        });
        ctx.args.data = preparedData;
        ctx.args.originalData = originalData;

        // Shortahnd for the relationModel upsert function
        const relationModel = this[this.modelName].app.models[translationRelationConfig.model];
        let { upsert } = relationModel;
        upsert = upsert.bind(relationModel);

        // Update all translations, errors will be catched by the registerHook
        // function
        await Promise.all(originalData.translations
            .map(translation => upsert(translation)));

        return false;
    }

    /**
     * Delte all related translations for a given record
     *
     * @param  {Object}  ctx the request context
     * @return {Promise}     stops the middle ware chain if true
     */
    async deleteTranslations(ctx) {
        const translationRelationConfig = this[this.modelName].definition
            .settings.relations.translations;
        await this[this.modelName].app.models[translationRelationConfig.model]
            .destroyAll({ [translationRelationConfig.foreignKey]: ctx.args.id });
    }

    async propagateTranslations(ctx, instance, translationHandlerContext = {}) {
        // Nothing to propageate if no language is acceppted
        if (!ctx.req.parsedHeaders || !ctx.req.parsedHeaders['accept-language']) {
            return;
        }

        const translationConfig = this[this.modelName].definition.settings
            .translations;
        const translationRelationConfig = this[this.modelName].definition
            .settings.relations.translations;
        const modelTranslations = await this[this.modelName].app
            .models[translationRelationConfig.model]
            .find({ where: { [translationRelationConfig.foreignKey]: instance.id }, order: 'locale_id ASC' });
        // TODO: May this needs an include filter after switching to the locale service
        const locales = await this[this.modelName].app
            .models.Locale.find();
        const preparedLocales = locales.map((locale) => {
            const result = locale.toJSON();
            result.locale = `${locale.language['iso-2-char']}-${locale.country.short}`.toLowerCase();

            return result;
        });
        const { options } = translationHandlerContext;
        if (ctx.req.headers['accept-language'] && !ctx.req.parsedHeaders['accept-language']) {
            throw new MicroserviceError('Please register the headerParser middleware served with the translation component');
        }
        const acceptHeaders = ctx.req.parsedHeaders['accept-language'];
        acceptHeaders.push(options.defaultAcceptHeader);

        const translation = TranslationHandler
            .getFallbackTranslation(modelTranslations, acceptHeaders, preparedLocales);

        translationConfig.forEach((translatedProperty) => {
            instance[translatedProperty] = translation[translatedProperty] ?
                translation[translatedProperty] : '';
        });

    }

    static getFallbackTranslation(translations, acceptHeaders, locales) {
        const searchHeader = acceptHeaders.shift();
        let locale;

        if (searchHeader.language !== '' && searchHeader.country !== '') {
            // Header has a locale spcigied
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
                return searchLocale.id === translations[0].locale_id;
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

        // Check the next translation in the fallback chain
        return TranslationHandler
            .getFallbackTranslation(translations, acceptHeaders, locales);

    }

    /**
     * Check if multiple translations have the same locale_id
     *
     * @param  {Array} translations An array with transaltion objects
     * @return {void}
     */
    static checkForDublicatedLocales(translations) {
        const usedLocales = [];
        translations.forEach((translation) => {
            if (usedLocales.includes(translation.locale_id)) {
                throw new MicroserviceError('Translation for locale already exists', translation);
            }
            usedLocales.push(translation.locale_id);
        });
    }
};
