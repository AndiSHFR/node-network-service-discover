# node-network-service-discover
A [Node.js](http://nodejs.org/) package to advertise and discover services running on your local network.


## Motivation

This project started because i had several microservices as Node.js applications and wanted them to _find_ each other without configuring the actual service entry point for their api on each application.

Using IPv4 udp broadcasts this package can adverstise and discover your services.


## Installation

This package can be installed from the npm repository.

`npm install network-service-discover`


## Code Example

For a minimal code example see [minimal.js](./example/minimal.js).

Run this example on multiple computers on your local network.

```js
var NetWorkServiceDiscover = require('network-service-discover');
var nsd = NetworkServiceDiscover();

nsd.start(
  {
    // Udp port to send and receive packets
    port: 7691,

    // Send broadcast packet every 15 seconds.
    advertise: 15,

    // Remove services from the list when they have not been received for 60 seconds.
    purge: 60,

    // Array of services we want to advertise on the network.
    //
    //  name   {string}   - Name of the service
    //  port   {integer}  - Udp port the service is listening on
    //  secure {bool}     - True if secured aka. SSL connection
    //  path   {string}   - Path for the RESTfull api
    service: [
      { name: 'WarehouseCatalog', port: 45241, secure: false, path: '/api/whc/V01/' },
    ],

    // Callback function called in case of an error.
    error: function(err) {
      err && console.log(err);
    },

    // Callback function called when new services are discovered.
    change: function(data) {
      console.log(data);      
    }
  },
  function(err) {
    err && console.log(err);
  }
);

// Every minute output the list of discovered services to the console.
setInterval(
  function() {
    console.log('Discovered:', nsd.getServices());
  }, 
  60000
);

```

## Debugging

To enable debug output you need to set the `DEBUG` environment variable to _NetworkServiceDiscover_.

```cmd
SET DEBUG=NetworkServiceDiscover
npm start
```

## License

```node-network-service-discover``` is published under [MIT](LICENSE) license

