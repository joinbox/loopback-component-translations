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
                    locale_id: 1, // de-ch from fixture
                },
                {
                    name: 'testname Translation Two',
                    description: 'Translation Two testDescription',
                    locale_id: 2, // fr-ch from fixtures
                },
                {
                    name: 'English Translation',
                    description: 'English testDescription',
                    locale_id: 9, // en-gb  from fixture
                },
            ],
        };
    }
};
