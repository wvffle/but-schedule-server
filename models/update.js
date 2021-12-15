'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Update extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  Update.init({
    hash: DataTypes.STRING,
    date: DataTypes.DATE,
    data: DataTypes.JSON,
    diff: DataTypes.JSON
  }, {
    sequelize,
    modelName: 'Update',
  });
  return Update;
};