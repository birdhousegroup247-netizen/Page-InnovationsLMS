require('dotenv').config();
const { User } = require('../models');

async function getCredentials() {
  try {
    // Get 3 instructors
    const instructors = await User.findAll({
      where: { role: 'instructor' },
      attributes: ['id', 'full_name', 'email', 'role'],
      limit: 3
    });

    // Get 5 students
    const students = await User.findAll({
      where: { role: 'student' },
      attributes: ['id', 'full_name', 'email', 'role'],
      limit: 5
    });

    console.log('\n=== INSTRUCTOR ACCOUNTS ===');
    instructors.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.full_name}`);
      console.log(`Password: password123\n`);
    });

    console.log('\n=== STUDENT ACCOUNTS ===');
    students.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.full_name}`);
      console.log(`Password: password123\n`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

getCredentials();
