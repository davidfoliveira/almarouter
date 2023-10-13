const EventEmitter = require('node:events');
const mqtt = require('mqtt');


class MQTTClient extends EventEmitter {
  constructor(opts={}) {
    super({ captureRejections: true });
    require('mqtt');

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

    console.log(`INFO: Connecting to MQTT on ${this.url} ...`);
    this.client = mqtt.connect(this.url);
    this.client.on('connect', () => {
      console.log(`INFO: Connected to MQTT on ${this.url} !`);
      this.connecting = false;
      this.connected = true;
      this.emit('connect');
    });
    this.client.on('error', (error) => {
      console.warn(`ERROR: Error connecting to MQTT on ${this.url}: ${error}`);
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
      console.log(`WARN: Disconnected from MQTT on ${this.url}`);
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

