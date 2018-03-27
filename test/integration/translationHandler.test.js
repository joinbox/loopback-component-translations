const { expect } = require('chai');

describe('File Storage Integration Test', () => {
    const endPointUrl = 'http://localhost:3000/api/TranslationDummy/';

    it('returns a valid response', async function() {
        const response = await this.service.api.request.get(endPointUrl);
        expect(response.status).to.equals(200);
    });

});
