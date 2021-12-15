'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Teacher extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  Teacher.init({
    hash: DataTypes.STRING,
    name: DataTypes.STRING,
    surname: DataTypes.STRING,
    initials: DataTypes.STRING,
    title: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Teacher',
  });
  return Teacher;
};