const path = require('path');
const Microservice = require('@joinbox/loopback-microservice');

(async function() {
    const appRootDir = path.resolve(__dirname, '../server');
    const projectBootDir = path.resolve(__dirname, '../../../src/boot/');
    const appConfigRootDir = appRootDir;
    const dsRootDir = appConfigRootDir;
    const modelsRootDir = appConfigRootDir;
    const middlewareRootDir = appConfigRootDir;
    const componentRootDir = appConfigRootDir;
    const boot = {
        appRootDir,
        appConfigRootDir,
        bootDirs: [`${appRootDir}/boot`, projectBootDir],
        env: 'test',
        componentRootDir,
        middlewareRootDir,
        modelsRootDir,
        dsRootDir,
    };

    this.service = await Microservice.boot({ boot });
    await this.service.start();
}());
