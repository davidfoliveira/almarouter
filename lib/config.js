// Read the config file
process.env.SUPPRESS_NO_CONFIG_WARNING = true;
const path = require('path');
const config = require('config');

// Generate the right configuration file path
const configFile = config.util.getCmdLineArg('config') || `${__dirname}/../etc/mrouter.json`;

process.env.NODE_CONFIG_ENV = path.basename(configFile).replace(/\.\w+$/, '');
config.util.extendDeep(config, config.util.loadFileConfigs(path.dirname(configFile)));

module.exports = config;
