const dgram = require("dgram");
const EventEmitter = require('node:events');


class UDPClient extends EventEmitter {
  constructor(opts={}) {
    super({ captureRejections: true });

    this.host = opts.host || "127.0.0.1";
    this.port = opts.port || 7000;
    this.ipv6 = !!opts.ipv6;

    this.client = null;
  }

  connect() {
    this.emit('connect');
  }
  disconnect() { }

  async send(msg) {
    if (!this.client) {
      this.client = dgram.createSocket(this.ipv6 ? 'udp6' : 'udp4');
    }

    return new Promise((res, rej) => {
      this.client.send(msg, this.port, this.host, (err) => {
        if (err) {
          console.error(`ERRO: Error sending UDP packet: ${err}`);
          return rej(err);
        }

        return res();
      });
    });
  }

}

module.exports = {
  UDPClient,
};
