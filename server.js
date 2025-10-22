
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config(); // 加载 .env 文件中的环境变量

const app = express();
const port = process.env.PORT || 3000; // 可以从 .env 配置端口，默认为 3000

app.use(cors());
app.use(express.json());

// Database connection configuration
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
pool.getConnection()
    .then(connection => {
        console.log('Connected to MySQL database');
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to MySQL database:', err.message);
    });

// API endpoint to get all reports (id and name)
app.get('/api/reports', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, report_name FROM reports');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ message: 'Error fetching reports', error: error.message });
    }
});

// API endpoint to get a single report by ID
app.get('/api/reports/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT id, report_name, report_content FROM reports WHERE id = ?', [id]);
        if (rows.length > 0) {
            res.status(200).json(rows[0]);
        } else {
            res.status(404).json({ message: 'Report not found' });
        }
    } catch (error) {
        console.error('Error fetching report by ID:', error);
        res.status(500).json({ message: 'Error fetching report', error: error.message });
    }
});

// API endpoint to save or update reports
app.post('/api/reports', async (req, res) => {
    console.log('POST /api/reports received:', req.body);
    const { id, report_name, report_content } = req.body;

    //console.log('Received report data:', req.body);
    if (!report_name || !report_content) {
        return res.status(400).json({ message: 'Report name and content are required.' });
    }

    try {
        if (id) {
            // Update existing report
            const [result] = await pool.execute(
                'UPDATE reports SET report_name = ?, report_content = ? WHERE id = ?',
                [report_name, report_content, id]
            );
            if (result.affectedRows > 0) {
                res.status(200).json({ message: 'Report updated successfully', reportId: id });
            } else {
                res.status(404).json({ message: 'Report not found for update' });
            }
        } else {
            // Insert new report
            const [result] = await pool.execute(
                'INSERT INTO reports (report_name, report_content) VALUES (?, ?)',
                [report_name, report_content]
            );
            res.status(201).json({ message: 'Report saved successfully', reportId: result.insertId });
        }
    } catch (error) {
        console.error('Error saving/updating report:', error);
        res.status(500).json({ message: 'Error saving/updating report', error: error.message });
    }
});

// API endpoint to delete a report by ID
app.delete('/api/reports/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.execute('DELETE FROM reports WHERE id = ?', [id]);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Report deleted successfully' });
        } else {
            res.status(404).json({ message: 'Report not found for deletion' });
        }
    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).json({ message: 'Error deleting report', error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
