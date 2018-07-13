module.exports = class TestDataProvider {
    static getTestData() {
        return {
            noTranslate: 'noTranslateTest',
            name: 'testname',
            description: 'testDescription',
            translations: [
                {
                    name: 'testname Translation One',
                    description: 'Translation One testDescription',
                    locale_id: 1,
                },
                {
                    name: 'testname Translation Two',
                    description: 'Translation Two testDescription',
                    locale_id: 2,
                },
            ],
        };
    }
};
