const express = require('express');
const bodyParser = require('body-parser');

const dsl2json = require('./dsl2json');
const json2dsl = require('./json2dsl');

const app = express();
const PORT = 5000;

// Middleware to parse JSON and URL-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Define a route for the JSON parser page
app.get('/jsonparser', (req, res) => {
  res.sendFile(__dirname + '/public/jsonparser.html');
});

// Define a route for the Documentation page
app.get('/docs', (req, res) => {
  res.sendFile(__dirname + '/public/docs.html');
});

// DSL to JSON
app.post("/parse", (req, res) => {
    const input = req.body.dsl;
    try {
        const rule = dsl2json(input);
        res.json({ success: true, rule });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// JSON to DSL
app.post('/jsonparser', (req, res) => {
  const jsonInput = req.body.jsonInput;
  try {
      const dslOutput = json2dsl(jsonInput);
      res.json({ success: true, dslOutput });
  } catch (error) {
      res.json({ success: false, message: error.message });
  }
});

// Run the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});