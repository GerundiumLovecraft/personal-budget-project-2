const getClient = require('../db/pool-db.js');

class budgetController {
    async getAllBudget(req, res) {
        const result = await getClient.query('SELECT * FROM budget_list');
        res.send(result.rows);
    };

    async getOneBudget(req, res) {
        const {budgetId} = req.params;

        //get budget plan and all envelopes that are connected to it
        const resultBudget = await getClient.query('SELECT * FROM budget_list WHERE budget_ID = $1', [budgetId]);
        const resultEnvelopes = await getClient.query('SELECT * FROM envelope_list WHERE budget_id = $1', [budgetId]);

        if (resultBudget.rows.length == 0) {
            res.status(404).send('Budget not found');
        };

        const resultAll = [resultBudget.rows[0], resultEnvelopes.rows];
        //Response will send both the budget plan and the envelopes that are connected to it
        res.send(resultAll);
    };

    async postOneBudget(req, res) {
        const {year, month, budget, currency} = req.body;
        const remainder = budget;
        try {
            const result = await getClient.query('INSERT INTO budget_list(year, month, budget, remainder, currency) VALUES ($1, $2, $3, $4, $5)', [year, month, budget, remainder, currency]);
        } catch (e) {
            throw e;
        };

         res.status(201).send('OK');
        
    };

    async putOneBudget(req, res) {
        const {budgetId} = req.params;
        const {year, month, budget, currency} = req.body;
        const initBudgetInfoRaw = await getClient.query('SELECT * FROM budget_list WHERE budget_id = $1', [budgetId]);

        const initBudgetInfo = initBudgetInfoRaw.rows[0];

        //Calculate used budget to compare against 
        const budgetUsed = initBudgetInfo['budget'] - initBudgetInfo['remainder']
        try {

            await getClient.query('BEGIN');

            // check if updated budget will cover the costs of the envelopes if it will be updated
            if (budget && budget < budgetUsed) {
                try {
                    res.status(400).send('Budget does not cover the costs');
                    throw new Error('Budget does not cover the costs');
                } catch (e){
                    throw e;
                }
            };

            const newRemainder = () => {
                return (budget - budgetUsed);
            }
            // budget to be updated
            await getClient.query('UPDATE budget_list SET year = $1, month = $2, budget = $3, remainder = $4, currency = $5 WHERE budget_id = $6', [(year ? year : initBudgetInfo['year']), (month ? month : initBudgetInfo['month']), (budget ? budget : initBudgetInfo['budget']), (budget ? newRemainder() : initBudgetInfo['remainder']), (currency ? currency : initBudgetInfo['currency']), (budgetId)])

            //in case of currencty change currency will be changed in envelopes and spending records that are related to this budget plan
            if (currency) {
                await getClient.query('UPDATE envelope_list SET currency = $1 WHERE budget_id = $2', [currency, budgetId]);
                await getClient.query('UPDATE spending_list SET currency = $1 WHERE budget_id = $2', [currency, budgetId]);
            };

            await getClient.query('COMMIT');
        } catch (e) {
            await getClient.query('ROLLBACK');
            throw e;
        };
        
        res.status(200).send('Budget successfully updated!');
    };

    async deleteOneBudget(req, res) {
        const {budgetId} = req.params;
        try {
            await getClient.query('DELETE FROM budget_list WHERE budget_id = $1', [budgetId]);
        } catch (e) {
            throw e;
        };

        res.status(204).send('Budget plan deleted!');
        
    };
};

module.exports = new budgetController();