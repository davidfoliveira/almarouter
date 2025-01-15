#!/usr/bin/env node

const config = require('config');
const { Router } = require('../lib/router');


const router = new Router(config);
router.start();