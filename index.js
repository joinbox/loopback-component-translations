const TranslationHandler = require('./src/TranslationHandler');

module.exports = function(app) {
    const handler = new TranslationHandler(app);
    handler.registerTranslationHooks();
};

/*
const path = require('path');
const Microservice = require('@joinbox/loopback-microservice');

const appRootDir = path.resolve(__dirname, './test/support/server');
const projectBootDir = path.resolve(__dirname, './src/boot/');
const options = {
    appRootDir,
    bootDirs: [`${appRootDir}/boot`, projectBootDir],
    env: 'test',
};

(async() => {
    this.service = await Microservice.boot(options);
    await this.service.start();
})();
*/
