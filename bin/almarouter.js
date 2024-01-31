#!/usr/bin/env node

const { UDPServer } = require('../lib/server/udp');
const { TCPServer } = require('../lib/server/tcp');
const { Backend } = require('../lib/backend');
const config = require('../lib/config');
const { isObject, objectMatches } = require('../lib/util');


const BACKENDS = { };

// Parse and prepare the config
if (!config.backends || config.backends.length === 0) {
  throw new Error('No backends have been configured. Stopping here!');
}
Object.keys(config.backends || []).forEach((id) => {
  BACKENDS[id] = new Backend(id, config.backends[id]);
});
(config.backendSelector || []).forEach((rule) => {
  if (rule.rxMatches) rule.rxMatches = new RegExp(rule.rxMatches);
});


function findBackend(msg) {
  const parsedAs = { };

  for (let rule of config.backendSelector) {
    let parsedMsg;
    if (!rule.target) continue;

    // Bare matching options
    if (rule.rxMatches && !msg.match(rule.rxMatches)) continue;
    if (rule.strContains && msg.indexOf(rule.strContains) < 0) continue;

    // Parsing options
    if (rule.parser) {
      // If we tried to parse it already and failed, let's not even parse it again
      if (parsedAs[rule.parser] === null) {
        continue;
      }
      // It's been parsed correctly already, perfect!
      else if (parsedAs[rule.parser]) { }
      else if (rule.parser === 'json') {
        try {
          parsedAs.json = JSON.parse(msg);
        }
        catch(ex) {
          // Unable to parse it as it was written in the rule, skip it!
          parsedAs.json = null;
          continue;
        }
      }
      parsedMsg = parsedAs[rule.parser];
    }

    // Parsed message matching options
    if (typeof rule.bodyMatches === 'object' && isObject(parsedMsg)) {
      try {
        if (!objectMatches(parsedMsg, rule.bodyMatches)) continue;
      }
      catch(ex) {
        console.error(`ERRO: Error testing object matching against '${msg}': ${ex}. Ignoring rule.`);
        continue;
      }
    }

    return BACKENDS[rule.target];
  }
  return null;
}

// The good stuff starts here
const ServerClass = (config.server || {}).proto == 'tcp' ? TCPServer : UDPServer;
server = new ServerClass(config.server || {});
server.listen(async (msg) => {
  const be = findBackend(msg);
  if (!be) {
    console.warn(`WARN: Could not find an appropriate backend for message: '${msg}'. Ignoring it!`);
    return;
  }

  // Send message to its corresponding backend
  if (config.verbose) console.log(`[${be.id}] > ${msg.length} bytes`);
  be.send(msg);
});

