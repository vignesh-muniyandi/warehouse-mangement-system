const { Sequelize } = require('sequelize');
const UserModel = require('./User');
const RoleModel = require('./Role');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required for Sequelize models');
}

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: false,
  define: {
    underscored: true,
    freezeTableName: false,
  },
});

const User = UserModel(sequelize);
const Role = RoleModel(sequelize);

User.belongsTo(Role, { as: 'role', foreignKey: 'role_id' });
Role.hasMany(User, { foreignKey: 'role_id' });

module.exports = {
  sequelize,
  User,
  Role,
};
