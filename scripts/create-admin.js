const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://bida_admin:bida_secret_2024@postgres:5432/bida_booking'
});

async function createAdmin() {
    try {
        const hash = await bcrypt.hash('123456', 12);
        console.log('Generated hash:', hash);

        // Delete old admin if exists
        await pool.query("DELETE FROM users WHERE email = 'admin@gmail.com'");

        const result = await pool.query(
            `INSERT INTO users (email, password_hash, full_name, phone, role) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            ['admin@gmail.com', hash, 'Admin User', '0900000001', 'admin']
        );
        console.log('User created:', result.rows[0]);

        // Verify
        const verify = await bcrypt.compare('123456', result.rows[0].password_hash);
        console.log('Password verification:', verify);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

createAdmin();
