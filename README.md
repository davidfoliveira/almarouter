# node-message-router - A Node.js powered multi-backend message router

## Installing it
	$ npm i -g message-router

## Running it
	$ mrouter --config=/path/for/config/file.json

## Configuration

### Minimum configuration

{
  "server": {
    "proto": "tcp|udp"
  },
  "backends": {
    "backend-one": {
      "proto": "tcp|udp",
      "host": "some.host.here",
      "port": 1234
    }
  },
  "backendSelector": [
    {
      ...rules here...
      "rxMatches": "^{.*}$",
      "parser": "json",
      "bodyMatches": { "type": "meh" },
      "target": "backend-one",
    }
  ]
}


### Supported selector rules

- strContains: Accepts a string; Check if the message content contains the provided string;

- rxMatches: Accepts a regular expression such as `"^regular expression$"`; Checks if the message content matches the provided RegExp;

- parser: Accepts only "json" for now; Parses the message as JSON to then allow other rules to run, such as `bodyMatches`;

- bodyMatches: Accepts an object; Checks whether the parsed object contains (at least) the provided object structure;