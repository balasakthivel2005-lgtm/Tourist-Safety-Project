const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',       // Usually 'root'
  password: 'king',
  database: 'tourist_safety'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting: ' + err.stack);
    return;
  }
  console.log('Database connected successfully!');
});

module.exports = connection;