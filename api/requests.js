const envelopeRouter = require('express').Router();

const budgetController = require('../routes/budget_list.js');
const envelopeController = require('../routes/envelope_list.js');
const spendingController = require('../routes/spending_list.js');

//get main view
envelopeRouter.get('/', budgetController.getAllBudget);

//get specific monthly budget plan
envelopeRouter.get('/:budgetId', budgetController.getOneBudget);

//get specific envelope
envelopeRouter.get('/:budgetId/:envelopeId', envelopeController.getOneEnvelope);

//get specific spending record
envelopeRouter.get('/:budgetId/:envelopeId/:spendingId', spendingController.getOneSpending);

//create monthly budget plan
envelopeRouter.post('/', budgetController.postOneBudget);

//create envelope
envelopeRouter.post('/:budgetId', envelopeController.postOneEnvelope);

//create spending record
envelopeRouter.post('/:budgetId/:envelopeId', spendingController.postOneSpending);

//make changes to monthly budget plan
envelopeRouter.put('/:budgetId', budgetController.putOneBudget);

//make changes to envelope
envelopeRouter.put('/:budgetId/:envelopeId', envelopeController.putOneEnvelope);

//make changes to spending record
envelopeRouter.put('/:budgetId/:envelopeId/:spendingId', spendingController.putOneSpending);

//delete monthly budget plan
envelopeRouter.delete('/:budgetId', budgetController.deleteOneBudget);

//delte envelope in a monthly budget plan
envelopeRouter.delete('/:budgetId/:envelopeId', envelopeController.deleteOneEnvelope);

// delete spending record
envelopeRouter.delete('/:budgetId/:envelopeId/:spendingId', spendingController.deleteOneSpending);

module.exports = envelopeRouter;