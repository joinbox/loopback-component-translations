const aclData = require('./aclData');
const roleData = require('./roleData');
const userData = require('./userData');

class DataCreator {
    constructor(models) {
        this.ACL = models.ACL;
        this.Role = models.Role;
        this.User = models.User;
        this.RoleMapping = models.RoleMapping;
    }

    async createAndLinkData() {
        const roles = await this.createRoles();
        const acls = await this.createAcls();
        const users = await this.createUsers();

        return Promise.all(roles.map((role, index) => {
            return role.principals.create({
                principalType: this.RoleMapping.USER,
                principalId: users[index].id,
            });
        }));
    }

    async createAcls() {
        return DataCreator.createData(this.ACL, aclData);
    }

    async createUsers() {
        return DataCreator.createData(this.User, userData);
    }

    async createRoles() {
        return DataCreator.createData(this.Role, roleData);
    }

    static async createData(model, data) {
        return Promise.all(data.map(entry => model.create(entry)));
    }
}

module.exports = function(models) {
    const creator = new DataCreator(models);
    return creator.createAndLinkData();
};
