const { LoopbackModelBase } = require('@joinbox/loopback-microservice');

class TranslationDummyModel extends LoopbackModelBase {
    constructor(model) {
        super({ model });

        this.registerHook('beforeRemote', 'create', this.prepateRequestData);
        this.registerHook('afterRemote', 'create', this.createTransltions);
    }

    async prepateRequestData(ctx) {
        const { translations } = this.TranslationDummy.definition.settings;

        // Case no translations
        if (!translations) {
            return false;
        }

        const originalData = ctx.args.data;
        const preparedData = {};

        const modelPropperties = this.TranslationDummy.definition.properties;

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

        if (!this.TranslationDummy.definition.settings.relations.translations) {
            throw new Error(`You don't have a translation configuration in your models relations!`);
        }

        const translationConfig = this.TranslationDummy.definition.settings
            .relations.translations;



        // TODO: Multiplae transltions with same id or no locales
        //

        const translationsToCreate = data.translations.map((translation) => {
            const translationToCreate = translation;
            translationToCreate[translationConfig.foreignKey] = instance.id;

            return translationToCreate;
        });

        await this.TranslationDummy.app.models[translationConfig.model]
            .create(translationsToCreate);

        // call next after the async function
        return false;
    }
}

module.exports = function(model) {
    return new TranslationDummyModel(model);
};
