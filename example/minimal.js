/*!
 * minimal.js
 * Minimalistic example to get the advertising and discovery up and running.
 * 
 * Run this example on multiple hosts on your loca network and watch the console output.
 */
var
  NetworkServiceDiscover = require('../src/network-service-discover'),
  nsd = NetworkServiceDiscover();
  ;
  
nsd.start(
  {
    // Udp port to send and receive packets
    port: 7691,

    // Send boradcast packet every 15 seconds.
    advertise: 15,

    // Remove services from the list when they have not been received for 60 seconds.
    purge: 60,

    // A array of services we want to advertise on the network.
    //
    //  name   {string}   - Name of the service
    //  port   {integer}  - Ip Port he service is listening on
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
  function(socket, err) {
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
