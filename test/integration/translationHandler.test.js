const { expect } = require('chai');
const TestDataProvider = require('./TestDataProvider');

describe('Translations Integration Test', () => {
    const endPointUrl = 'http://localhost:60001/api/TranslationDummy/';

    it('returns a valid response', async function() {
        const response = await this.service.api.request.get(endPointUrl);
        expect(response.status).to.equals(200);
    });

    it('persists translations', async function() {
        const testData = TestDataProvider.getTestData();

        const response = await this.service.api.request
            .post(endPointUrl)
            .send(testData);

        expect(response.body).to.have.property('id', 1);
        expect(response.body).to.have.property('noTranslate', 'noTranslateTest');
        expect(response.body).to.not.have.property('name');
    });

    it('rejects translations with the same locales', async function() {
        const testData = TestDataProvider.getTestData();
        testData.translations[1].locale_id = 1;

        const response = await this.service.api.request
            .post(endPointUrl)
            .send(testData)
            .catch((error) => {
                expect(error.status).to.equals(500);
            });

        expect(response).to.equals(undefined);
    });

    it('updates translations when updating the according entity with translation data', async function() {
        const testData = TestDataProvider.getTestData();
        const updateTestData = TestDataProvider.getTestData();

        const createResponse = await this.service.api.request
            .post(endPointUrl)
            .send(testData);
        expect(createResponse.status).to.equals(200);

        const dataUrl = `${endPointUrl}${createResponse.body.id}`;
        const getEndPointUrl = `${dataUrl}?filter=%7B%22include%22%3A%20%22translations%22%7D`
        const getResponseBeforeUpdate = await this.service.api.request.get(getEndPointUrl);

        updateTestData.translations[0].name = 'Updated Name Translation One';
        updateTestData.translations[0].id = getResponseBeforeUpdate.body.translations[0].id;
        updateTestData.translations[0].translationdummy_id = createResponse.body.id;
        updateTestData.translations[1].name = 'Updated Name Translation Two';
        updateTestData.translations[1].id = getResponseBeforeUpdate.body.translations[1].id;
        updateTestData.translations[1].translationdummy_id = createResponse.body.id;

        expect(getResponseBeforeUpdate.body).to.have.property('translations');
        expect(getResponseBeforeUpdate.body.translations[0]).include(testData.translations[0]);
        expect(getResponseBeforeUpdate.body.translations[1]).include(testData.translations[1]);

        const updateReponse = await this.service.api.request
            .patch(dataUrl)
            .send(updateTestData);
        expect(updateReponse.status).to.equals(200);


        const getResponseAfterUpdate = await this.service.api.request.get(getEndPointUrl);

        expect(getResponseAfterUpdate.body).to.have.property('translations');
        expect(getResponseAfterUpdate.body.translations[0]).include(updateTestData.translations[0]);
        expect(getResponseAfterUpdate.body.translations[1]).include(updateTestData.translations[1]);
    });

    it('deletes translations', async function() {
        const testData = TestDataProvider.getTestData();

        const createResponse = await this.service.api.request
            .post(endPointUrl)
            .send(testData);
        expect(createResponse.status).to.equals(200);

        const deleteEndpoint = `${endPointUrl}${createResponse.body.id}`;
        const deleteResponse = await this.service.api.request
            .delete(deleteEndpoint);

        expect(deleteResponse.status).to.equals(200);
        expect(deleteResponse.body).to.have.property('count', 1);
    });

    it('returns existing translation accorrding to Accept-Language header de-ch', async function() {
        const testData = TestDataProvider.getTestData();

        const createResponse = await this.service.api.request
            .post(endPointUrl)
            .send(testData);
        expect(createResponse.status).to.equals(200);

        const getEndpoint = `${endPointUrl}${createResponse.body.id}`;
        const getResponse = await this.service.api.request
            .get(getEndpoint)
            .set('Accept-Language', 'de-ch, en-GB, DE_LU');

        expect(getResponse.status).to.equals(200);
        expect(getResponse.body).to.have.property('name', 'testname Translation One');
        expect(getResponse.body).to.have.property('description', 'Translation One testDescription');
    });

    it('returns existing translation accorrding to Accept-Language header fr-ch', async function() {
        const testData = TestDataProvider.getTestData();

        const createResponse = await this.service.api.request
            .post(endPointUrl)
            .send(testData);
        expect(createResponse.status).to.equals(200);

        const getEndpoint = `${endPointUrl}${createResponse.body.id}`;
        const getResponse = await this.service.api.request
            .get(getEndpoint)
            .set('Accept-Language', 'du-my, fr-ch, de-ch, en-GB, DE_LU');

        expect(getResponse.status).to.equals(200);
        expect(getResponse.body).to.have.property('name', 'testname Translation Two');
        expect(getResponse.body).to.have.property('description', 'Translation Two testDescription');
    });

    it('returns existing translation accorrding to Accept-Language header de-ch;q=0.5, fr-ch;q=1', async function() {
        const testData = TestDataProvider.getTestData();

        const createResponse = await this.service.api.request
            .post(endPointUrl)
            .send(testData);
        expect(createResponse.status).to.equals(200);

        const getEndpoint = `${endPointUrl}${createResponse.body.id}`;
        const getResponse = await this.service.api.request
            .get(getEndpoint)
            .set('Accept-Language', 'de-ch;q=0.5, fr-ch;q=1');

        expect(getResponse.status).to.equals(200);
        expect(getResponse.body).to.have.property('name', 'testname Translation Two');
        expect(getResponse.body).to.have.property('description', 'Translation Two testDescription');
    });

    it('returns empty translation accorrding to Accept-Language header en-gb', async function() {
        const testData = TestDataProvider.getTestData();

        const createResponse = await this.service.api.request
            .post(endPointUrl)
            .send(testData);
        expect(createResponse.status).to.equals(200);

        const getEndpoint = `${endPointUrl}${createResponse.body.id}`;
        const getResponse = await this.service.api.request
            .get(getEndpoint)
            .set('Accept-Language', 'en-GB');

        expect(getResponse.status).to.equals(200);
        expect(getResponse.body).to.have.property('name', '');
        expect(getResponse.body).to.have.property('description', '');
    });

    it('returns default german translation accorrding to Accept-Language header de', async function() {
        const testData = TestDataProvider.getTestData();

        const createResponse = await this.service.api.request
            .post(endPointUrl)
            .send(testData);
        expect(createResponse.status).to.equals(200);

        const getEndpoint = `${endPointUrl}${createResponse.body.id}`;
        const getResponse = await this.service.api.request
            .get(getEndpoint)
            .set('Accept-Language', 'de');

        expect(getResponse.status).to.equals(200);
        expect(getResponse.body).to.have.property('name', 'testname Translation One');
        expect(getResponse.body).to.have.property('description', 'Translation One testDescription');
    });

    it('returns first translation according to Accept-Language header *', async function() {
        const testData = TestDataProvider.getTestData();

        const createResponse = await this.service.api.request
            .post(endPointUrl)
            .send(testData);
        expect(createResponse.status).to.equals(200);

        const getEndpoint = `${endPointUrl}${createResponse.body.id}`;
        const getResponse = await this.service.api.request
            .get(getEndpoint)
            .set('Accept-Language', '*');

        expect(getResponse.status).to.equals(200);
        expect(getResponse.body).to.have.property('name', 'testname Translation One');
        expect(getResponse.body).to.have.property('description', 'Translation One testDescription');
    });

    it('returns translations for all found instances', async function() {
        const testData = TestDataProvider.getTestData();

        const createResponse = await this.service.api.request
            .post(endPointUrl)
            .send(testData);
        expect(createResponse.status).to.equals(200);
        const createResponse2 = await this.service.api.request
            .post(endPointUrl)
            .send(testData);
        expect(createResponse2.status).to.equals(200);

        const getEndpoint = `${endPointUrl}`;
        const getResponse = await this.service.api.request
            .get(getEndpoint)
            .set('Accept-Language', '*');

        expect(getResponse.status).to.equals(200);

        getResponse.body.forEach((entity) => {
            expect(entity).to.have.property('name');
            expect(entity).to.have.property('description');
        });

    });
});
