const cors = require('cors');
const pkg = require('pg');
const { Client } = pkg;
const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const port = 5004;
const codes = []; // Declare the codes array globally


app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgres://postgres:1CCf63d-c25c3dgff1Cab6F2A5*C5cFC@roundhouse.proxy.rlwy.net:38917/railway';

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');
  } catch (error) {
    console.error('Error connecting to PostgreSQL database:', error);
  }
}

connectToDatabase();
async function initDatabase() {
    try {
      // Drop the existing table
      await client.query(`
        DROP TABLE IF EXISTS generated_codes;
      `);
  
      // Recreate the table with the new schema
      await client.query(`
        CREATE TABLE IF NOT EXISTS generated_codes (
          id SERIAL PRIMARY KEY,
          fileName TEXT,
          walletAddress TEXT,
          code TEXT 
        );
      `);
  
      console.log('Generated codes table created');
  
      const codesResult = await client.query(`
        SELECT * FROM generated_codes;
      `);
  
      codes.push(...codesResult.rows);
  
      console.log('Codes array initialized');
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }

initDatabase();
app.post('/save-code', async (req, res) => {
    const { code, walletAddress } = req.body;
  
    try {
      // Save the code information to the database
      const result = await client.query(
        `
        INSERT INTO generated_codes (fileName, walletAddress, code)
        VALUES ($1, $2, $3)
        RETURNING *;
      `,
        [`gen${codes.length + 1}.html`, walletAddress, code]
      );
  
      const savedCode = result.rows[0];
  
      // Update the in-memory codes array
      codes.push(savedCode);
  
      res.json({ success: true, code: savedCode });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Error saving code.' });
    }
  });
  app.get('/get-codes', async (req, res) => {
    try {
      // Fetch codes from the database
      const result = await client.query('SELECT * FROM generated_codes');
      const codesFromDatabase = result.rows;
  
      res.json({ success: true, codes: codesFromDatabase });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Error fetching codes.' });
    }
  });
  
  app.get('/get-code/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await client.query(
        'SELECT * FROM generated_codes WHERE id = $1',
        [id]
      );
  
      if (result.rows.length === 0) {
        // Handle code not found
        res.status(404).send('Code not found.');
        return;
      }
  
      const savedCode = result.rows[0];
      res.json({ success: true, code: savedCode });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Error fetching code.' });
    }
  });
  
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });