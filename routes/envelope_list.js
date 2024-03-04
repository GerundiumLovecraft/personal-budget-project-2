const { get } = require('../api/requests.js');
const getClient = require('../db/pool-db.js');

class envelopeController {
    
    async getOneEnvelope(req, res) {
        const {budgetId, envelopeId} = req.params;
        
        // get envelope and spending records for this envelope
        const resultEnvelope = await getClient.query('SELECT * FROM envelope_list WHERE envelope_id = $1 AND budget_id = $2', [envelopeId, budgetId]);
        const resultSpendings = await getClient.query('SELECT * FROM spending_list WHERE envelope_id = $1 AND budget_id = $2', [envelopeId, budgetId]);


        if (resultEnvelope.rows.length == 0) {
            res.status(404).send('Envelope not found');
        };

        const resultAll = [resultEnvelope.rows[0], resultSpendings.rows];

        //Response will send both the envelope and all spending records that are connected to it
        res.send(resultAll);
    };

    async postOneEnvelope(req, res) {
        const {envelope_name, envelope_budget} = req.body;
        const {budgetId} = req.params;
        const envelope_remainder = envelope_budget;
        const init_budget_info = await getClient.query('SELECT remainder, currency FROM budget_list WHERE budget_id = $1', [budgetId]);
        const currency = init_budget_info.rows[0]["currency"];

        if (init_budget_info.rows.length == 0) {
            res.status(404).send('Budget not found');
        };

        // Check if there is the remainder of the budget allows to assign suggested amount to the envelope
        if (envelope_budget > init_budget_info.rows[0]["remainder"]) {
            res.status(500).send('Insufficient funds');
        };

        try {
            // Begin transaction that will deduct envelope budget from the remainder in the budget plan
            await getClient.query('BEGIN');
            await getClient.query('UPDATE budget_list SET remainder = $1 WHERE budget_id = $2', [(init_budget_info.rows[0]["remainder"] - envelope_budget), budgetId])
            const result = await getClient.query('INSERT INTO envelope_list(envelope_name, envelope_budget, envelope_remainder, currency, budget_id) VALUES ($1, $2, $3, $4, $5)', [envelope_name, envelope_budget, envelope_remainder, currency, budgetId]);
            
            //check if the deduction was performed correctly
            const updated_remainder = await getClient.query('SELECT remainder FROM budget_list WHERE budget_id = $1', [budgetId]);
            const assumed_remainder = init_budget_info.rows[0]["remainder"] - envelope_budget;

            if (updated_remainder.rows[0]["remainder"] == assumed_remainder) {
                await getClient.query('COMMIT');
            } else {
                res.status(500).send('An unexpeted error occurred');
                throw new Error("Unexpected error");
            }

            console.log(result.rows[0]);
        } catch (e) {
            await getClient.query('ROLLBACK');
            throw e;
        };
        
        res.status(201).send('OK');
        
    };

    async putOneEnvelope(req, res) {
        const {budgetId, envelopeId} = req.params;
        const {envelope_name, envelope_budget} = req.body;

        const envelopeInitStateRaw = await getClient.query('SELECT envelope_name, envelope_budget, envelope_remainder FROM envelope_list WHERE envelope_id = $1 AND budget_id = $2', [envelopeId, budgetId]);
        const budgetPlanDetailsRaw = await getClient.query('SELECT budget, remainder FROM budget_list WHERE budget_id = $1', [budgetId]);

        const envelopeInitState = envelopeInitStateRaw.rows[0];
        const budgetPlanDetails = budgetPlanDetailsRaw.rows[0];

        if (!envelopeInitState) {
            res.status(404).send('Envelope not found');
        };

        const envelopeBudgetUsed = envelopeInitState['envelope_budget'] - envelopeInitState['envelope_remainder'];

        const updatedEnvelopeRemainder = () => {
            return (envelope_budget - envelopeBudgetUsed);
        };

        //check if the new envelop budget will cover the spent amount
        if (envelope_budget && envelope_budget < envelopeBudgetUsed) {
            res.status(400).send('New budget does not cover costs');
        }
        try {
            await getClient.query('BEGIN');

            await getClient.query('UPDATE envelope_list SET envelope_name = $1, envelope_budget = $2, envelope_remainder = $3 WHERE envelope_id = $4 AND budget_id = $5', [(envelope_name ? envelope_name : envelopeInitState['envelope_name']), (envelope_budget ? envelope_budget : envelopeInitState['envelope_budget']), (envelope_budget ? updatedEnvelopeRemainder() : envelopeInitState['envelope_remainder']), envelopeId, budgetId]);
            if (envelope_budget) {
                const envelopeBudgetSumRaw = await getClient.query('SELECT SUM(envelope_budget) FROM envelope_list WHERE budget_id = $1', [budgetId]);

                const envelopeBudgetSum = envelopeBudgetSumRaw.rows[0]['sum'];
                const updatedBudgetRemainder = Number(budgetPlanDetails['budget']) - Number(envelopeBudgetSum);

                await getClient.query('UPDATE budget_list SET remainder = $1 WHERE budget_id = $2', [updatedBudgetRemainder, budgetId]);
            };
            

            await getClient.query('COMMIT');
        } catch (e) {
            await getClient.query('ROLLBACK');
            res.status(500).send('Unexpected error');
            throw e;
        };

        res.status(200).send('Envelope updated');
    };

    async deleteOneEnvelope(req, res) {
        const {budgetId, envelopeId} = req.params;

        try {
            await getClient.query('BEGIN')
            await getClient.query('DELETE FROM envelope_list WHERE envelope_id = $1 AND budget_id = $2', [envelopeId, budgetId]);

            const envelopeBudgetSumRaw = await getClient.query('SELECT SUM(envelope_budget) FROM envelope_list WHERE budget_id = $1', [budgetId]);
            const budgetPlanDetailsRaw = await getClient.query('SELECT budget FROM budget_list WHERE budget_id = $1', [budgetId]);

            const envelopeBudgetSum = Number(envelopeBudgetSumRaw.rows[0]['sum']);
            const budgetPlanDetails = Number(budgetPlanDetailsRaw.rows[0]['budget']);

            const updatedBudgetRemainder = budgetPlanDetails - envelopeBudgetSum;

            await getClient.query('UPDATE budget_list SET remainder = $1 WHERE budget_id = $2', [updatedBudgetRemainder, budgetId]);

            await getClient.query('COMMIT');
        } catch (e) {
            await getClient.query('ROLLBACK');
            res.status(500).send('Unexpected error');
            throw e;
        };

        res.status(204).send('Envelope successfuly deleted!');
        
    };

};

module.exports = new envelopeController();