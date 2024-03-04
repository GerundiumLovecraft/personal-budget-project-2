const {Pool} = require('pg');
const pool = new Pool({
    host: 'dpg-cmtaef0cmk4c738mabug-a.frankfurt-postgres.render.com',
    port: 5432,
    database: 'monthly_budget_db',
    user: 'monthly_budget_db_user',
    password: '0I4yVqPKlaLFjVjb6qcGOD48K1cDdieP',
    ssl: true,
    max: 10,
    connectionTimeoutMillis: 20000,
    allowExitOnIdle: true
});

async function query(text, params) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
}
   
async function getClient() {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;
    // set a timeout of 5 seconds, after which we will log this client's last query
    const timeout = setTimeout(() => {
        console.error('A client has been checked out for more than 5 seconds!');
        console.error(`The last executed query on this client was: ${client.lastQuery}`);
    }, 5000);
    // monkey patch the query method to keep track of the last query executed
    client.query = (...args) => {
        client.lastQuery = args;
        return query.apply(client, args);
    };
    client.release = () => {
        // clear our timeout
        clearTimeout(timeout);
        // set the methods back to their old un-monkey-patched version
        client.query = query;
        client.release = release;
        return release.apply(client);
    };
    return client;
}

module.exports = {
    query,
    getClient
};
