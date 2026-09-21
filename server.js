const express = require('express');
const app = express();
const PORT = 3000;

app.get('/status', (req, res) => {
    res.json({
        status: "success",
        version: process.env.APP_VERSION || "v1-stable",
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));