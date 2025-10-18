const { listAllUsers } = require('../src/lib/db');

console.log('Testing database functions...');

try {
  console.log('Testing listAllUsers:');
  const users = listAllUsers();
  console.log('Users found:', users.length);
  console.log('First user:', users[0]);
} catch (error) {
  console.error('Error:', error);
}