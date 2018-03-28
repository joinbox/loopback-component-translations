const { expect } = require('chai');

describe('File Storage Integration Test', () => {
    const endPointUrl = 'http://localhost:60001/api/TranslationDummy/';

    it('returns a valid response', async function() {
        const response = await this.service.api.request.get(endPointUrl);
        expect(response.status).to.equals(200);
    });

    it('persists translations', async function() {
        const testData = {
            noTranslate: 'noTranslateTest',
            name: 'testname',
            description: 'testDescription',
            translations: [
                {
                    name: 'testname Translation One',
                    'description Translation One': 'testDescription',
                    locale_id: 1,
                },
                {
                    name: 'testname Translation Two',
                    'description Translation Two': 'testDescription',
                    locale_id: 2,
                },
            ],
        };

        const response = await this.service.api.request
            .post(endPointUrl)
            .send(testData);

        expect(response.body).to.have.property('id', 1);
        expect(response.body).to.have.property('noTranslate', 'noTranslateTest');
        expect(response.body).to.not.have.property('name');
    });

    it('rejects translations with the same locales', async function() {
        const testData = {
            noTranslate: 'noTranslateTest',
            name: 'testname',
            description: 'testDescription',
            translations: [
                {
                    name: 'testname Translation One',
                    'description Translation One': 'testDescription',
                    locale_id: 1,
                },
                {
                    name: 'testname Translation Two',
                    'description Translation Two': 'testDescription',
                    locale_id: 1,
                },
            ],
        };

        const response = await this.service.api.request
            .post(endPointUrl)
            .send(testData)
            .catch((error) => {
                expect(error.status).to.equals(500);
            });

        expect(response).to.equals(undefined);
    });
});
