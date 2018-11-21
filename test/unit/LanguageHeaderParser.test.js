const LanguageHeaderParser = require('../../src/parser/LanguageHeaderParser.js');
const { expect } = require('chai');
const { describe, it } = require('mocha');

describe('Class LanguageHeaderParser', () => {

    it('exposes a static parseRFCPrioritizedHeader function', () => {
        expect(LanguageHeaderParser.parseRFCPrioritizedHeader).to.be.a('Function');
    });

    it('exposes a static parseLanguageHeader function', () => {
        expect(LanguageHeaderParser.parseLanguageHeader).to.be.a('Function');
    });

    it('parsed and prioritizes the headers correctly', () => {
        const parsedHeaders = LanguageHeaderParser.parseRFCPrioritizedHeader('en-US;q=0.7,en;q=0.5, de-ch;q=1');

        expect(parsedHeaders).to.be.an('Array').with.length(3);
        expect(parsedHeaders[0]).to.deep.equal({ language: 'de', country: 'ch', priority: 1 });
        expect(parsedHeaders[1]).to.deep.equal({ language: 'en', country: 'us', priority: 0.7 });
        expect(parsedHeaders[2]).to.deep.equal({ language: 'en', country: '', priority: 0.5 });
    });

    it('parsed and prioritizes the headers correctly', () => {
        const parsedHeaders = LanguageHeaderParser.parseRFCPrioritizedHeader('*');

        expect(parsedHeaders).to.be.an('Array').with.length(1);
        expect(parsedHeaders[0]).to.deep.equal({ language: '*', country: '', priority: 1 });
    });
});
