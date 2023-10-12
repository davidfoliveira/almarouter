var net = require('net');
const EventEmitter = require('node:events');


class TCPClient extends EventEmitter {
  constructor(opts={}) {
    super({ captureRejections: true });

    this.host = opts.host || "127.0.0.1";
    this.port = opts.port || 7000;
    this.connected = false;

    this.client = new net.Socket();
    this.client.on('close', () => {
      if (!this.connected) return;
      this.connected = false;
      console.log(`WARN: Disconnected from ${this.host}:${this.port}`);
      this.emit('disconnect');
    });
  }

  connect() {
    if (this.connecting) return;
    this.connecting = true;

    console.log(`INFO: Connecting to ${this.host}:${this.port} ...`);
    this.client.connect(this.port, this.host, () => {
      console.log(`INFO: Connected to ${this.host}:${this.port} !`);
      this.connecting = false;
      this.connected = true;
      this.emit('connect');
    });
    this.client.on('error', (error) => {
      console.warn(`ERROR: Error connecting to ${this.host}:${this.port}: ${error}`);
      this.connecting = false;
      this.connected = false;
      this.emit('error', error);
    });
  }

  disconnect() {
    this.client.close();
  }

  async send(msg) {
    this.client.write(msg+"\n");
  }
}

module.exports = {
  TCPClient,
};

