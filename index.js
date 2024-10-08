const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const bodyParser = require('body-parser');
const { generateReportQuery } = require('./constants/Query');
const https = require('https');
const fs = require('fs');

const app = express();
const port = 8081;
// const options = {
//     key: fs.readFileSync('server.key'),
//     cert: fs.readFileSync('server.cert')
//   };
require('dotenv').config(); // Load environment variables from .env file
const corsOptions = {
    origin: 'http://103.254.185.56:3434', // Public IP of your frontend
    methods: ['GET', 'POST'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
    credentials: true // Allow credentials (cookies, authorization headers, etc.)
};

// Use CORS middleware with options
app.use(cors());
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: 1433,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true' // Convert string to boolean
    }
};

// Middleware
app.use(bodyParser.json());
// app.use(cors(corsOptions));

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

// API endpoint to fetch data from subSystems table by userId
app.get('/fetch-sub-systems', async (req, res) => {
    const { userId, systemId } = req.query;

    // Basic validation
    if (!userId || !systemId) {
        return res.status(400).json({ error: 'userId and systemId are required' });
    }

    try {
        // Create a new SQL request
        const request = new sql.Request();

        // Add input parameters
        request.input('UserId', sql.VarChar, userId);
        request.input('SystemId', sql.VarChar, systemId);

        // Query the subSystems table to find data by userId and systemId
        const result = await request.query('SELECT * FROM subSystems WHERE userId = @UserId AND systemId = @SystemId');

        if (result.recordset.length === 0) {
            // If no data found for the provided userId and systemId
            return res.status(404).json({ error: 'No sub-systems data found for this userId and systemId' });
        }

        // On successful data fetch
        res.status(200).json({ message: 'Data fetched successfully', data: result.recordset });
    } catch (error) {
        console.error('Error fetching sub-systems data:', error);
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

app.listen(8081, () => {
    console.log('Server is running on https://192.168.1.4:8081');
  });
