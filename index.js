const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');

//process listener to catch the errors that might occur during the requests
process.on('uncaughtException', (error, origin) => {
    console.log('----- Uncaught exception -----')
    console.log(error)
    console.log('----- Exception origin -----')
    console.log(origin)
})

process.on('unhandledRejection', (reason, promise) => {
    console.log('----- Unhandled Rejection at -----')
    console.log(promise)
    console.log('----- Reason -----')
    console.log(reason)
})


app.use(express.static(__dirname));

const PORT = 3000;

// Add middleware for handling CORS requests from index.html

app.use(cors());

// Add middware for parsing request bodies here:

app.use(bodyParser.json());

// Mount your existing apiRouter below at the '/api' path.
const apiRouter = require('./api/api.js');
app.use('/', apiRouter);

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});