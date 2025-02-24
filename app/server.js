const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res, next) => {
  // 50% chance to throw a 500 error for testing error conditions
  if (Math.random() < 0.50) {
    const error = new Error("Internal Server Error");
    error.status = 500;
    return next(error);
  }
  
  // Send the HTML file instead of inline HTML
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Custom error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).send(err.message);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
