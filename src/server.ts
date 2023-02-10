import * as hantepay from "./services/hantepay";

require("source-map-support").install()
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require("helmet");
const bodyParser = require("body-parser");


const app = express();
//middleware
app.use(cors());
app.use(helmet());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

const port = process.env.PORT

app.get('/', (req, res) => {
  res.send('The server is running!!!')
})

app.post('/hantepay', hantepay.makePayment);
app.post('/hantepay/notify/:orderNo', hantepay.notify);
app.post('/hantepay/callback/:orderNo', hantepay.callback);

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})