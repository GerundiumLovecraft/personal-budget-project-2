const getClient = require('../db/pool-db.js');

class spendingController {

    async getOneSpending(req, res) {
        const {budgetId, envelopeId, spendingId} = req.params;

        const result = await getClient.query('SELECT * FROM spending_list WHERE spending_id = $1 AND envelope_id = $2 AND budget_id = $3', [spendingId, envelopeId, budgetId]);

        if (result.rows.length == 0) {
            res.status(404).send('Spending record not found');
        };

        res.status(200).send(result.rows[0]);
    };

    async postOneSpending(req, res) {
        const { budgetId, envelopeId } = req.params;
        const { spending_name, spending_amount, spending_info } = req.body;

        //Get information from other tables that will be entered into the spending_list entry
        const envelopeRemainder = await getClient.query('SELECT envelope_remainder FROM envelope_list WHERE envelope_id = $1 AND budget_id = $2', [envelopeId, budgetId]);
        const budgetCurrency = await getClient.query('SELECT currency FROM budget_list WHERE budget_id = $1', [budgetId]);

        const updatedEnvelopeRemainder = envelopeRemainder.rows[0]['envelope_remainder'] - spending_amount;

        try {
            await getClient.query('BEGIN');

            await getClient.query('INSERT INTO spending_list(spending_name, spending_amount, spending_info, currency, envelope_id, budget_id) VALUES ($1, $2, $3, $4, $5, $6)', [spending_name, spending_amount, (spending_info ? spending_info : 'N/A'), budgetCurrency.rows[0]['currency'], envelopeId, budgetId]);
            await getClient.query('UPDATE envelope_list SET envelope_remainder = $1 WHERE envelope_id = $2', [updatedEnvelopeRemainder, envelopeId]);

            await getClient.query('COMMIT');
        } catch (e) {
            await getClient.query('ROLLBACK');
            res.status(400)
            throw e;
        };

        res.status(200).send('Spending record added!');
        
    };

    async putOneSpending(req, res) {
        //pull data from request to work with
        const { budgetId, envelopeId, spendingId } = req.params;
        const { spending_name, spending_amount, spending_info } = req.body;

        // pull data from db to work with
        const initSpendingInfoRaw = await getClient.query('SELECT spending_name, spending_amount, spending_info FROM spending_list WHERE spending_id = $1 AND envelope_id = $2 AND budget_id = $3', [spendingId, envelopeId, budgetId]);
        const initEnevlopeInfoRaw = await getClient.query('SELECT envelope_budget FROM envelope_list WHERE envelope_id = $1 AND budget_id = $2', [envelopeId, budgetId]);

        const initSpendingInfo = initSpendingInfoRaw.rows[0];
        const initEnevlopeInfo = initEnevlopeInfoRaw.rows[0];

        if (initSpendingInfo.length == 0) {
            res.status(404).send('Spending record not found');
        };

        try {
            await getClient.query('BEGIN');

            await getClient.query('UPDATE spending_list SET spending_name = $1, spending_amount = $2, spending_info = $3 WHERE spending_id = $4 AND envelope_id = $5 AND budget_id = $6', [(spending_name ? spending_name : initSpendingInfo['spending_name']), (spending_amount ? spending_amount : initSpendingInfo['spending_amount']), (spending_info ? spending_info : initSpendingInfo['spending_info']), spendingId, envelopeId, budgetId]);

            // if amount in spending is affected
            if (spending_amount) {

                const spendingSumRaw = await getClient.query('SELECT SUM(spending_amount) FROM spending_list WHERE envelope_id = $1 AND budget_id = $2', [envelopeId, budgetId]);

                const spendingSum = Number(spendingSumRaw.rows[0]['sum']);

                const envelope_remainder = initEnevlopeInfo['envelope_budget'] - spendingSum;

                //pre-check of new envelope_remainder
                if (envelope_remainder < 0 ) {
                    res.status(400).send('Remainder of your envelope cannot fall below 0')
                    throw new Error('Insufficient funds');
                }

                await getClient.query('UPDATE envelope_list SET envelope_remainder = $1 WHERE envelope_id = $2 AND budget_id = $3', [envelope_remainder, envelopeId, budgetId]);
            };

            await getClient.query('COMMIT');
            res.status(200).send('Corrections applied to the spending record');

        } catch (e) {
            await getClient.query('ROLLBACK');
            res.status(400).send(e);
            throw e;
        };
        
    };

    async deleteOneSpending(req, res) {
        const {budgetId, envelopeId, spendingId} = req.params;

        try {

            await getClient.query('BEGIN');
            //delete the spending record
            await getClient.query('DELETE FROM spending_list WHERE spending_id = $1 AND envelope_id = $2 AND budget_id = $3', [spendingId, envelopeId, budgetId]);

            //get updated sum of all spending amounts
            const updatedSpendingSumRaw = await getClient.query('SELECT SUM(spending_amount) FROM spending_list WHERE envelope_id = $1 AND budget_id = $2', [envelopeId, budgetId])
            const updatedSpendingSum = Number(updatedSpendingSumRaw.rows[0]['sum']);

            //update the envelope's remainder
            const envelopeBudgetRaw = await getClient.query('SELECT envelope_budget FROM envelope_list WHERE envelope_id = $1 AND budget_id = $2', [envelopeId, budgetId]);
            const envelopeBudget = Number(envelopeBudgetRaw.rows[0]['envelope_budget']);
            await getClient.query('UPDATE envelope_list SET envelope_remainder = $1 WHERE envelope_id = $2 AND budget_id = $3', [(envelopeBudget - updatedSpendingSum), envelopeId, budgetId]);

            await getClient.query('COMMIT');
        } catch (e) {
            await getClient.query('ROLLBACK');
            throw e;
        };

        res.status(204).send('Spending record successfuly deleted!');

    };
};

module.exports = new spendingController();