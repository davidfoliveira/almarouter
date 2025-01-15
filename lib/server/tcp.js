const net = require('net');

class TCPServer {

  constructor(opts={}) {
    this.host = opts.host || '0.0.0.0';
    this.port = opts.port || 9001;
    this.maxBufferSize = opts.maxBufferSize || 65536; // 64k
    this._cb = null;

    // Create the TCP server instance
    this._server = net.createServer();
    this._server.on('connection', con => this._acceptConnection(con));
  }

  _acceptConnection(con) {
    const remoteAddress = `${con.remoteAddress}:${con.remotePort}`;
    con._buf = Buffer.alloc(0);
    con.on('data', (data) => {
      con._buf = Buffer.concat([con._buf, data]);
      if (con._buf.length > this.maxBufferSize) {
        console.warn(`WARN: Client '${remoteAddress}' is misbehaving. Disconnecting!`);
        con.destroy();
      }

      // Emit the necessary messages
      while (con._buf.indexOf("\n") > -1) {
        const p = con._buf.indexOf("\n");
        const msg = con._buf.subarray(0, p);
        this._cb(msg.toString());
        con._buf = con._buf.subarray(p+1);
      }
    });
    con.once('close', () => {
      console.warn(`WARN: Connection from '${remoteAddress}' got closed.`);
      const endBuf = con._buf;
      if (endBuf.length > 0) this._cb(endBuf.toString());
      con._buf = Buffer.alloc(0);
    });
    con.on('error', (err) => {
      console.error(`ERRO: Connection error with client '${remoteAddress}': ${err}`);
      con._buf = Buffer.alloc(0);
      con.destroy();
    });
  }

  listen(cb) {
    this._cb = cb;
    this._server.listen(this.port, this.host, () => {
      console.info(`INFO: [changed]: TCP server listening to ${JSON.stringify(this._server.address())}`);
    });
  }

  stop() {
    console.info(`INFO: [changed]: TCP server stopping`);
    this._server.destroy();
  }

}


module.exports = { TCPServer };
