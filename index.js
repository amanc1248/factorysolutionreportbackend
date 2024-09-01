const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const bodyParser = require('body-parser');
const { generateReportQuery } = require('./constants/Query');

const app = express();
const port = 8081;
require('dotenv').config(); // Load environment variables from .env file

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true' // Convert string to boolean
    }
};

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Connect to SQL Server
sql.connect(config, err => {
    if (err) {
        console.error('Error connecting to the database:', err);
        throw err;
    }
    console.log('Connection Successful!');
});

// Default route
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Route to get report
app.post('/get-report', async (req, res) => {
    const { startDate, endDate, interval, systemId, userId, } = req.body;

    // Basic validation
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start Date and end date are required' });
    }

    const query = generateReportQuery(startDate, endDate, interval, systemId, userId);

    try {
        const request = new sql.Request();
        const result = await request.query(query);
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('Error executing query:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Login API endpoint
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // Create a new SQL request
        const request = new sql.Request();

        // Add input parameters
        request.input('Email', sql.VarChar, email);
        request.input('Password', sql.VarChar, password);

        // Query the user table to find the user by email and password
        const result = await request.query('SELECT * FROM [user] WHERE email = @Email AND password = @Password');

        if (result.recordset.length === 0) {
            // If no user found with the provided email
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.recordset[0];
        // On successful login
        res.status(200).json({ message: 'Login successful', id: user.id, userId: user.id, userId: user.userId, email: user.email, password: user?.password, reportHeader: user.reportHeader });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint to fetch data from systems table by userId
app.get('/fetch-systems', async (req, res) => {
    const { userId } = req.query;

    // Basic validation
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    try {
        // Create a new SQL request
        const request = new sql.Request();

        // Add input parameter
        request.input('UserId', sql.VarChar, userId);

        // Query the systems table to find data by userId
        const result = await request.query('SELECT * FROM systems WHERE userId = @UserId');

        if (result.recordset.length === 0) {
            // If no data found for the provided userId
            return res.status(404).json({ error: 'No systems data found for this userId' });
        }

        // On successful data fetch
        res.status(200).json({ message: 'Data fetched successfully', data: result.recordset });
    } catch (error) {
        console.error('Error fetching systems data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/get-column-names', async (req, res) => {
    try {
        // Create a new SQL request
        const request = new sql.Request();

        // Query to get all column names except 'id', 'userId', and 'systemId'
        const result = await request.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'maindata'
            AND COLUMN_NAME NOT IN ('id', 'userId', 'systemId','DateAndTime');
        `);

        // Extract column names from the result
        const columnNames = result.recordset.map(row => row.COLUMN_NAME);

        // Send column names as response
        res.status(200).json({ columnNames });
    } catch (error) {
        console.error('Error fetching column names:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
