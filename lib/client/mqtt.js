const EventEmitter = require('node:events');

// Try loading the MQTT module
let mqtt;
try {
  mqtt = require('mqtt');
}
catch(ex) { }


class MQTTClient extends EventEmitter {
  constructor(opts={}) {
    super({ captureRejections: true });

    // Check if the MQTT module is available
    if (!mqtt) {
      throw new Error(`ERRO: Please install 'mqtt' in order to use MQTT backends.`);
    }

    this.url = opts.url || 'mqtt://127.0.0.1';
    if (!this.url.match(/^\w+:\/\//))
      this.url = `mqtt://${this.url}`;

    this.topic = opts.topic || '/test/almarouter';
    this.publishOpts || undefined;
    this.connected = false;

    this.client = null;
  }
 
  connect() {
    if (this.connecting) return;
    this.connecting = true;

    console.info(`INFO: Connecting to MQTT on ${this.url} ...`);
    this.client = mqtt.connect(this.url);
    this.client.on('connect', () => {
      console.info(`INFO: Connected to MQTT on ${this.url} !`);
      this.connecting = false;
      this.connected = true;
      this.emit('connect');
    });
    this.client.on('error', (error) => {
      console.error(`ERRO: Error connecting to MQTT on ${this.url}: ${error}`);
      if (this.connected) {
        this.emit('disconnect');
      }
      this.connecting = false;
      this.connected = false;
      this.client.end(true);
      this.emit('error', error);
    });
    this.client.on('close', (error) => {
      if (!this.connected) return;
      this.connected = false;
      console.warn(`WARN: Disconnected from MQTT on ${this.url}`);
      this.emit('disconnect');
      this.client.end(true);
    });
  }

  disconnect() {
    this.client.end(true);
  }

  async send(msg) {
    return this.client.publishAsync(this.topic, msg, this.publishOpts);
  }
}

module.exports = {
  MQTTClient,
};

