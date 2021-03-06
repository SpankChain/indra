const fs = require('fs');
const { Pool } = require('pg');

const host = process.env.POSTGRES_URL || 'localhost:5432'
const user = process.env.POSTGRES_USER || 'user'
const database = process.env.POSTGRES_DB || 'database'
let password
if (process.env.POSTGRES_PASSWORD_FILE) {
  password = fs.readFileSync(process.env.POSTGRES_PASSWORD_FILE, 'utf8')
} else if (process.env.POSTGRES_PASSWORD) {
  password = process.env.POSTGRES_PASSWORD
} else {
  password = 'supersecret'
}

const pool = new Pool({
  connectionString: `postgres://${user}:${password}@${host}/${database}`
})

const query = async (sql) =>{
    try {
        return await pool.query(sql);
    } catch(e) {
        console.log(`Error: ${JSON.stringify(e.stack)}`)
        return null;
    }
};

module.exports = query
