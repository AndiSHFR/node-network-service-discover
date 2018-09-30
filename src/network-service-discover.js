/*!
 * network-service-discover.js
 * Discover running network services using udp datagrams.
 * 
 * Author: Andreas Schaefer <asc@schaefer-it.net>
 * 
 * This node module will enable you to discover services on the network.
 * Once configured it sends out udp datagrams advertising your list of services.
 * It also listens for incoming udp advertising packets and maintains a list of
 * services discovered.
 * 
 */
'use strict'

/** 
 * Module dependencies.
 * @private 
 */
var
  // 3rd party modules -> node_modules
  debug = require('debug')('NetworkServiceDiscover'), 
  os = require('os'),
  dgram = require('dgram'),

  // Project modules
  getIpv4Interfaces = require('./get-ipv4-interfaces'),
  getAddressInformation = require('./get-address-information'),

  // Locale variables
  DEFAULTS = {
    // Udp port to listen and send. 
    port: 1993,

    // Broadcast interval in seconds when sending datagram.
    advertise: 10,

    // Discovered services where last_seen is older than this 
    // number of seconds will be removed from the list.
    // Should be a multiple of the advertising interval.
    purge: 60,

    // Optional scope id to group servies that 
    // belong to the same logical group of infrastructure.
    scope: '',

    // If true then loopback interfaces will be included in the broadcast
    loopback: true,

    // List of services to advertise. A service entry must look like:
    // { name: 'MyService1', port: 1967, secure: false, path: '/api/D1/V01.000/' },
    service: [],

    // Callback function invoked when an error occurs.
    error: function(err) {},

    // Callback function called when adding or removing services
    change: function(data) {}
  }
;

function NetworkServiceDiscover() {
    var
      // COnfiguration options
      opts = {},

      // udp socket for receiving and sending datagrams
      socket = null,

      // id of the interval for sending datagrams
      timer = null,

      // Services to advertise on the network
      services = []
      ;

    /**
     * Debug output an error and call error callback.
     * @param {Error} err 
     */
    var _error = function(err) {
      err && debug('Error:', err);
      err && opts.error && opts.error(err);
    }

    /**
     * Cleanup resources.
     */
    var _cleanup = function() {
      timer && clearInterval(timer);
      timer = socket = null;
    }

    /**
     * Remove discovered services when the last_seen value is older than the purge deadline.
     */
    var _purge = function() {
      if(opts.purge <= 0) return;
      var deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() - opts.purge);
      services = services.filter(function(service) {
        return deadline.getTime() < service.last_seen.getTime();
      });
    }

    /**
     * Send a broadcast packet on all IPv4 interface addresses to adverstise the services of this instance.
     */
    var _sendDatagram = function() {
      if(!socket || 0 == opts.services.length) return;
      var
        data = {
          hostname: os.hostname(),
          scope: opts.scope,
          uptime_os: parseInt(os.uptime(), 10),
          uptime_proc: parseInt(process.uptime(), 10),
          service: opts.service
        },
        message = JSON.stringify(data),
        interfaces = getIpv4Interfaces(!opts.loopback)
        ;
      debug('Message of %s bytes created:', message.length, message);
      interfaces.forEach(function(iface) {
        var 
          info = getAddressInformation(iface.cidr),
          address = info.broadcast
          ;
        debug('Sending message to %s:%s', address, opts.port);
        address && socket && socket.send(message, opts.port, address, _error);
      });
      _purge();
    }

    /**
     * Socket callback for error event.
     * @param {Error} err 
     */
    var _socketError = function(err) {
      socket.close();
      _error(err);
    }

    /**
     * Socket callback for recived message.
     * @param {BUffer} msg    - Received data 
     * @param {object} rinfo  - remote information
     */
    var _socketMessage = function(msg, rinfo) {
      var 
        now = new Date(),
        data = JSON.parse(msg),
        received = data.service.map(
          function(svc) {
            return {
              hostname: data.hostname,
              service: svc.name,
              scope: data.scope,
              address: rinfo.address,
              port: svc.port,
              path: svc.path,
              uptime_os: data.uptime_os,
              uptime_proc: data.uptime_proc,
              last_seen: now
            };
          }
        ),
        serviceCount = service.length,
        changed = false
        ;
    
     services  = services.filter(function(known_service){
        return received.filter(function(received_service){
           return received_service.address == known_service.address &&
                  received_service.service == known_service.service;
        }).length == 0;
     }).concat(received);
     changed = services.length != serviceCount;

     _purge();
     changed = changed || (services.length != serviceCount);

     changed && opts.change && opts.change(services);
    }

    /**
     * Start the advertising and discovery process.
     * @param {object}   options - Configuration options. See DEFAULTS for settings 
     * @param {function} cb      - Callback function called on error and success.
     */
    var start = function(options, cb) {      
      if(socket) return;
      debug('Starting.');
      var err = null;
      var knownProperties = Object.keys(DEFAULTS);

      Object.keys(options).forEach(function(prop) {        
        if(-1 == knownProperties.indexOf(prop)) {
          err = new Error('Unkown option "' + prop + '".');
          cb && cb(null, err); 
          return;
        }
      });

      opts = Object.assign({}, DEFAULTS, options);

      // We do not want to flood the local network with broadcasts!
      if(opts.advertise < 5000) opts.advertise = 5000;
      
      socket = dgram.createSocket('udp4');
  
      socket.on('close', _cleanup);
      socket.on('error', _socketError);
      socket.on('message', _socketMessage);
      
      debug('Binding to port %s.', opts.port);
      socket.bind(opts.port, function(err) {
        if(err) {
          socket.close();
          cb && cb(null, err);
        } else {
          socket.setBroadcast(true); 
          if(opts.advertise > 0) {
            debug('Starting send timer for every %s seconds.', opts.advertise);
            timer = setInterval(_sendDatagram, 1000 * opts.advertise);
          }
          cb && cb(socket, err);
        }
      });
    }
    
    /**
     * Stop the advertising and discovery process.
     * @param {function} cb      - Callback function called on error or success.
     */
    var stop = function(cb) {
      debug('Stopping.');
      socket && socket.close(function() {
        cb && cb();
      });
    }

    /**
     * Return a list of discovered services
     */
    var getServices = function() {
      _purge();
      return services;
    }
  
    // Return the public interface to the caller
    return {
      start: start,
      stop: stop,
      getServices: getServices
    }
  
  }
  
/**
 * Module exports.
 * @public
 */
module.exports = NetworkServiceDiscover;
