const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app=express();
app.use(cors());
app.use(bodyParser.json());

// Postgress client Setup
const { Pool } = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgUser,
    database: keys.pgDatabase,
    port: keys.pgPort,
    password: keys.pgPassword
});
pgClient.on('error', () => console.log('Lost PG Connection'));

pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch(err => console.log(err));

// Redis Client Setup
const redis = require('redis');
const redisClient = redis.createClient({
    host : keys.redisHost,
    port: keys.redisPort,
    redis_strategy: () => 1000

});
const redisPublisher = redisClient.duplicate();


// Express Route Handlers

app.get('/',(req,res) => {
    res.send('Welcome');
});

app.get('/values/all', async (req, res) => {
    const values= await pgClient.query('SELECT * FROM VALUES');
    res.send(values.rows);
});

app.get('/values/current', async (req,res) => {
    redisClient.hgetall('values', (err, values) => {
        res.send(values);
        });
});

app.post('/values', async (req,res) => {
    const index=req.body.index;

    if (parseInt(index)>40) {
        return res.status(422).send('Index too high');
    }

    redisClient.hset('values',index,'Nothing yet!');
    redisPublisher.publish('insert',index);
    pgClient.query('INSERT INTO values(number) VALUES ($1)',[index]);

    res.send({working: true});
});

app.listen(5000, err => {
    console.log('Running the app on port 5000');

});