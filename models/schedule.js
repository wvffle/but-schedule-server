'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Schedule extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  Schedule.init({
    hash: DataTypes.STRING,
    day: DataTypes.INTEGER,
    hour: DataTypes.INTEGER,
    intervals: DataTypes.INTEGER,
    weekFlags: DataTypes.INTEGER,
    teacher: DataTypes.INTEGER,
    room: DataTypes.INTEGER,
    subject: DataTypes.INTEGER,
    type: DataTypes.STRING,
    group: DataTypes.INTEGER,
    degree: DataTypes.INTEGER,
    semester: DataTypes.INTEGER,
    speciality: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Schedule',
  });
  return Schedule;
};