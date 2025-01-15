const servers = require('../lib/server');
const { Router } = require('../lib/router');

describe('Router', () => {
  let router;
  let backendSend;
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
          "rxMatches": "^{.*hola.*}$",
          "parser": "json",
          "bodyMatches": { "type": "meh" }
        }
      ]
    };
    router = new Router(config);
    router.start();

    backendSend = jest.spyOn(router.backends['backend-one'], 'send');
  });

  afterEach(() => {
    router.stop();
  });

  it('sends messages to the right backend', async () => {
    serverInstance.callback('{"type": "meh", "hola":"nen"}');

    await new Promise(res => setTimeout(res, 100));
    expect(backendSend).toBeCalledWith("{\"type\": \"meh\", \"hola\":\"nen\"}");
  });

  it('ignores messages if the backend selector has ignore:true', async () => {
    router.config.backendSelector[0].ignore = true;
    serverInstance.callback('{"type": "meh", "hola":"nen"}', 9000, '127.0.0.1');

    await new Promise(res => setTimeout(res, 100));
    expect(backendSend).not.toBeCalled();
  });
});