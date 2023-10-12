const clients = {
  tcp:  require('./client/tcp').TCPClient,
  udp:  require('./client/udp').UDPClient,
//  mqtt: MQTTClient,
};

class Backend {
  constructor(id, opts={}) {
    this.id = id;
    this.proto = opts.proto || "tcp";
    this.host = opts.host || "127.0.0.1";
    this.port = opts.port || 7000;
    this.maxQueueLength = opts.maxQueueLength || 1000000; // 1 million messages; enough for us to restart a backend

    // Choose the client client protocol class
    this.clientClass = clients[this.proto];
    if (!this.clientClass) throw new Error(`Unsupported client protocol: '${this.proto}'`);

    this.reconnectInterval = 1000;
    this.queue = [];
    this.client = null;
    this.connected = false;
    this.connecting = false;
  }

  get status() {
    return this.connected ? 'connected' : this.connecting ? 'connecting' : this.client ? 'ready' : 'offline';
  }

  connect() {
    if (this.connected || this.connecting) {
      console.log(`WARN: Not connecting since ${this.connected} / ${this.connecting}`);
      return;
    }

    console.log(`INFO: Connecting to backend '${this.id}' ...`);
    this.connecting = true;
    this.client = new this.clientClass({
      host: this.host,
      port: this.port,
      autoReconnect: this.reconnectInterval,
    });
    this.client.on('connect', () => {
      this._tryQueueFlush();
      this.connected = true;
      this.connecting = false;
    });
    this.client.on('error', (err) => {
      console.log(`WARN: Connection to backend '${this.id}' failed: ${err}`);
      this.connected = false;
      this.connecting = false;
      this._retryConnect();
    });
    this.client.on('disconnect', () => {
      console.log(`WARN: Connection to backend '${this.id}' was lost`);
      this.connected = false;
      this._retryConnect();
    });
    this.client.connect();
  }

  _retryConnect() {
    setTimeout(() => {
      console.log(`WARN: Reconnecting with backend '${this.id}' ...`);
      this.connect();
    }, this.reconnectInterval);
  }

  _tryQueueFlush() {
    try {
      while (this.queue.length > 0) {
        const msg = this.queue[0];
        this._send(msg);
        this.queue.shift();
      }
      console.log(`INFO: Backend '${this.id} queue successfully flushed!'`);
    }
    catch(ex) {
      console.warn(`WARN: Error while trying to flush the queue after connect: ${ex}`);
    }
  }

  send(message) {
    if (!this.connected) {
      console.log(`INFO: Backend '${this.id}' not connected. Queuing message...`);
      this.queue.push(message);
      if (!this.client) this.connect();
    }
    else {
      try {
        this._send(message);
      }
      catch(ex) {
        console.warn(`WARN: Error sending message to backend '${this.id}: ${ex}; Queueing message...`);
        this.queue.push(message);
      }
    }
  }

  _send(message) {
    this.client.send(message);
  }
}

module.exports = {
  Backend,
};
