const localeData = require('../fixtures/locales');

class DataCreator {
    constructor(models) {
        this.Locale = models.Locale;
    }

    async createLocales() {
        return DataCreator.createData(this.Locale, localeData);
    }

    static async createData(model, data) {
        return Promise.all(data.map(entry => model.create(entry)));
    }
}

module.exports = async function(app, callback) {
    console.log('app.models.Locale', app.models.Locale);
    const creator = new DataCreator(app.models);
    await creator.createLocales(app.models);
    callback();
};
