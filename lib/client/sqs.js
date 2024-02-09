const EventEmitter = require('node:events');

// Try to load client-sqs from AWS
let SQSClient;
let SendMessageCommand;
let SendMessageBatchCommand;
let uuid;
try {
  ({ SQSClient, SendMessageCommand, SendMessageBatchCommand } = require("@aws-sdk/client-sqs"));
  uuid = require('uuid');
} catch(ex) { }

const util = require('../util');


class AWSSQSClient extends EventEmitter {
  constructor(opts={}) {
    super({ captureRejections: true });

    // Check if AWS's SQSClient is available
    if (!SQSClient) {
      throw new Error(`ERRO: Please install '@aws-sdk/client-sqs' in order to use SQS backends.`);
    }
    if (!uuid) {
      throw new Error(`ERRO: Please install 'uuid' in order to use SQS backends.`);
    }

    // Assemble the options object
    this.opts = Object.assign({
      region: 'us-east-1',
      retries: 0,
      retryInterval: 1000,
    }, opts || {});

    // Copy and validate some properties
    this.region = this.opts.region;
    this.queueURL = this.opts.queueURL;
    this.publishOpts = this.opts.publishOpts || { };
    this.batchSendInterval = null;
    this.sendingQueue = [ ];
    this.connected = false;
    if (!this.queueURL) throw new Error(`Fail: No 'queueURL' configuration has been set.`);
  }
 
  connect() {
    console.info(`INFO: Instantiating SQS client for '${this.queueURL}' queue in '${this.opts.region}' ...`);
    this.sqs = new SQSClient(this.opts);
    if (this.opts.batchSendInterval) {
      this.batchSendInterval = util.every(this.opts.batchSendInterval, () => this._flushQueue());
    }
    this.connected = true;
    this.emit('connect');
  }

  disconnect() {
    this.sqs = null;
    this.connected = false;
    this.emit('disconnect');
  }

  async _flushQueue() {
    if (this.sendingQueue.length === 0) return;
    console.debug(`DBUG: Flushing the sending queue with ${this.sendingQueue.length} message(s) in it...`);

    // Get a queue snapshot so we work with stable data
    const queueSnapshot = this.sendingQueue;
    this.sendingQueue = [];

    // Send
    const results = [ ];
    while (queueSnapshot.length > 0) {
      const items = queueSnapshot.splice(0, 10);
      const res = await this._sendCommand(new SendMessageBatchCommand({
        QueueUrl: this.queueURL,
        Entries: items.map((msg) => ({
          Id: uuid.v4(),
          MessageBody: msg,
          ...(this.publishOpts || {}),
        })),
      }));

      if (!res) {
        console.info(`INFO: Failed to send ${items.length} message(s) to SQS and retries have been exhausted`);
        return null;
      }

      console.info(`INFO: Successfully sent ${items.length} message(s) to SQS`);
    }

    return results;
  }

  async _sendCommand(command) {
    const className = command.constructor.toString().replace(/^class _?([^ ]+).*$/s, '$1');
    let res = null;
    let retries = this.opts.retries + 1;
    while (retries-- > 0) {
      console.info(`INFO: Sending a ${className} command to SQS...`);
      try {
        res = await this.sqs.send(command);
        break;
      }
      catch(ex) {
        console.error(`ERRO: Error sending a ${className} command to SQS:`, ex.stack);
        if (retries) {
          console.warn(`WARN: Retrying ${retries} more time(s)...`);
          await util.sleep(this.opts.retryInterval);
        }
      }
    }

    return res;
  }

  async send(msg) {
    // For batch sending...
    if (this.opts.batchSendInterval) {
      return this.sendingQueue.push(msg); // It'll be sent by _flushQueue()
    }

    return this._sendOne(msg);
  }

  async _sendOne(msg) {
    // For an individual message
    const command = new SendMessageCommand({
      QueueUrl: this.queueURL,
      MessageBody: JSON.stringify(msg),
      ...(this.publishOpts || {}),
    });
    console.info("INFO: Sending a single message to SQS...");

    let res;
    let retries = this.opts.retries + 1;
    while (retries-- > 0) {
      try {
        const response = await this.sqs.send(command);
        break;
      }
      catch(ex) {
        console.error(`ERRO: Error sending a message to SQS:`, ex.stack);
        if (retries) {
          console.warn(`WARN: Retrying ${retries} more time(s)...`);
          await util.sleep(this.opts.retryInterval);
        }
      }
    }

    if (!res) {
      console.info("INFO: Failed to send a message to SQS and retries have been exhausted");
      return null;
    }

    return 0;
  }
}

module.exports = {
  AWSSQSClient,
};

