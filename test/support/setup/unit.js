const path = require('path');
const Microservice = require('@joinbox/loopback-microservice');
const createData = require('../fixtures/createData');

before('boot microservice', async function() {
    const appRootDir = path.resolve(__dirname, '../server');
    const projectBootDir = path.resolve(__dirname, '../../../src/boot/');
    const options = {
        appRootDir,
        bootDirs: [`${appRootDir}/boot`, projectBootDir],
        env: 'test',
    };

    this.service = await Microservice.boot(options);
    await createData(this.service.app.models);
});
