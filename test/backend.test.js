const servers = require('../lib/server');
const { Router } = require('../lib/router');

describe('Backend', () => {
  let router;
  let serverInstance;

  beforeEach(() => {
    console.info = console.warn = console.debug = console.log = jest.fn();

    function TestServer(config) {
      this.listen = (cb) => { this.callback = cb; }
      this.stop = jest.fn();
      serverInstance = this;
      return this;
    }

    const protoName = `test${Math.random()}`;
    servers[protoName] = TestServer;
    const config = {
      "server": {
        "proto": protoName,
      },
      "backends": {
        "backend-one": {
          "proto": "mqtt",
          "url": "mqtt://127.0.0.1",
          "topic": "/test/mqtt",
          "disabled": true,
        }
      },
      "backendSelector": [
        {
          "target": "backend-one",
          "rxMatches": "^{.*}$",
          "parser": "json",
          "bodyMatches": { "type": "meh" }
        }
      ]
    };
    router = new Router(config);
    router.start();
  });

  afterEach(() => {
    router.stop();
  });

  it('discards messages when the queue is full', async () => {
    for (let x = 0 ; x <= 1100; x++) {
      serverInstance.callback('{"type": "meh", "hola":"nen"}', 9000, '127.0.0.1');
    }

    await new Promise(res => setTimeout(res, 900));
    expect(router.backends['backend-one'].queue.length).toBe(1101);
  });
});