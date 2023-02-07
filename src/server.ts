require("source-map-support").install()

//initializes
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);
