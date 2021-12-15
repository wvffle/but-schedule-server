'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Schedules', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      hash: {
        unique: true,
        type: Sequelize.STRING
      },
      day: {
        type: Sequelize.INTEGER
      },
      hour: {
        type: Sequelize.INTEGER
      },
      intervals: {
        type: Sequelize.INTEGER
      },
      weekFlags: {
        type: Sequelize.INTEGER
      },
      teacher: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Teachers',
          key: 'id'
        }
      },
      room: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Rooms',
          key: 'id'
        }
      },
      subject: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Subjects',
          key: 'id'
        }
      },
      type: {
        type: Sequelize.STRING
      },
      group: {
        type: Sequelize.INTEGER
      },
      degree: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Degrees',
          key: 'id'
        }
      },
      semester: {
        type: Sequelize.INTEGER
      },
      speciality: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Specialities',
          key: 'id'
        }
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Schedules');
  }
};