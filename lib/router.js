#!/usr/bin/env node

const servers = require('./server');
const { Backend } = require('./backend');
const config = require('./config');
const { isObject, objectMatches } = require('./util');


class Router {
  constructor(config) {
    this.config = config;
    this.backends = { };

    // Parse and prepare the config
    if (!config.backends || config.backends.length === 0) {
      throw new Error('No backends have been configured. Stopping here!');
    }
    Object.keys(config.backends || []).forEach((id) => {
      this.backends[id] = new Backend(id, config.backends[id]);
    });
    (config.backendSelector || []).forEach((rule) => {
      if (rule.rxMatches) rule.rxMatches = new RegExp(rule.rxMatches);
    });

    // Create the instance of the right server type
    const ServerClass = servers[(config.server.proto || 'udp')];
    if (!ServerClass) {
      throw new Error(`ERRO: Server class for '${config.server.proto}' could not be found`);
    }
    this.server = new ServerClass(config.server || {});
  }

  start() {
    this.server.listen(async (msg) => {
      const be = this.findBackend(msg);
      if (!be) {
        console.warn(`WARN: Could not find an appropriate backend for message: '${msg}'. Ignoring it!`);
        return;
      }
      // Should we ignore it?
      if (be.ignore) {
        return;
      }

      // Send message to its corresponding backend
      if (this.config.verbose) console.debug(`[${be.id}] > ${msg.length} bytes`);
      be.send(msg);
    });
  }

  stop() {
    console.warn(`INFO: Stopping server...`);
    this.server.stop();
  }

  findBackend(msg) {
    const parsedAs = { };

    for (let rule of this.config.backendSelector) {
      let parsedMsg;

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

      // Should we ignore this message?
      if (rule.ignore) {
        return { ignore: rule.ignore };
      }

      // No target? Just move on!
      if (!rule.target) continue;

      // Return the appropriate backend (in case it exists)
      return this.backends[rule.target];
    }
    return null;
  }

}

module.exports = {
  Router,
};
