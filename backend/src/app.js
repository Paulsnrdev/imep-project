const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("IMEP API Running...");
});

// In app.js
app.use('/api/users', require('./routes/userRoutes'));     // Admin CRUD
app.use('/api/user', require('./routes/user.routes'));     // Self-service

module.exports = app;