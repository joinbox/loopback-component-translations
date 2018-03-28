const Microservice = require('@joinbox/loopback-microservice');

const { LoopbackModelBase } = Microservice;
const MicroserviceError = Microservice.Error;

module.exports = class TranslationHandler {

    constructor(app) {
        this.app = app;
    }

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

                model.registerHook('beforeRemote', 'create', this.prepateRequestData);
                model.registerHook('afterRemote', 'create', this.createTransltions);
            }
        });
    }

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

        const usedLocales = [];
        data.translations.forEach((translation) => {
            // Check for duplicaed use if locales
            if (usedLocales.includes(translation.locale_id))  {
                throw new MicroserviceError('Translation for locale already exists', translation);
            }
            usedLocales.push(translation.locale_id);
        })

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
};
