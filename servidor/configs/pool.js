import "dotenv/config";
import mysql2 from "mysql2/promise";

// FIX: os nomes de env aqui precisam ser IDÊNTICOS aos do .env
// (antes estava USER_DB/PASSWORD_DB/HOST_DB/DATABASE_DB/PORTA_DB,
// mas o .env define DB_USER/DB_PASSWORD/DB_HOST/DB_NAME/DB_PORT —
// isso fazia o pool nunca receber as credenciais corretas).
const pool = mysql2.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  queueLimit: 0,
  waitForConnections: true,
});

export default pool;
