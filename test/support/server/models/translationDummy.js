const Microservice = require('@joinbox/loopback-microservice');

const { LoopbackModelBase } = Microservice;

class TranslationDummyModel extends LoopbackModelBase {
    constructor(model) {
        super({ model });
    }
}

module.exports = function(model) {
    return new TranslationDummyModel(model);
};
