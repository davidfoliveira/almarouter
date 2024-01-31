const dgram = require('dgram');

class UDPServer {

  constructor(opts={}) {
    this.host = opts.host || '0.0.0.0';
    this.port = opts.port || 9001;
    this._cb = null;

    this._server = dgram.createSocket(opts.ipv6 ? 'udp6' : 'udp4');
    this._server.on('message', (msg, rinfo) => this._cb(msg.toString(), rinfo));
    this._server.on('error', (err) => {
      console.error(`ERRO: UDP server error: ${err}`);
      this._server.close();
    });

    this._server.on('listening', () => {
     console.info(`INFO: Server listening to ${JSON.stringify(this._server.address())}`);
    });
  }

  listen(cb) {
    this._cb = cb;
    this._server.bind(this.port, this.host);
  }

}


module.exports = { UDPServer };
