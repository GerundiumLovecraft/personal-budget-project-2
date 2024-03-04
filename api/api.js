const apiRouter = require('express').Router();


const envelopeRouter = require('./requests.js')
apiRouter.use('/envelopes', envelopeRouter)


module.exports = apiRouter;