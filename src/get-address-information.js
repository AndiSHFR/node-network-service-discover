/*!
 * get-address-information.js
 * Return an object with information (network, cidr, broadcast, ...) regarding the address argument.
 * The address argument maybe an IPv4 address or a cird notation
 * 
 * Author: Andreas Schaefer <asc@schaefer-it.net>
 */
'use strict'

/** 
 * Module dependencies.
 * @private 
 */
var
  // 3rd party modules -> node_modules
  debug = require('debug')('GetAddressInformation'),

  // Project modules

  // Locale variables
  multipliers = [0x1000000, 0x10000, 0x100, 1]
  ;


function ip2long(ip) {
  var longValue = 0;
  ip.split('.').forEach(function(part, i) {longValue += part * multipliers[i];});
  return longValue;
}

function long2ip(longValue) {
  return multipliers.map(function(multiplier) {
    return Math.floor((longValue % (multiplier * 0x100)) / multiplier);
  }).join('.');
}

function isValidAddress(address) {
}

module.exports = function(address) {  

  if(!address) return null;
  //if(!isValidAddress(address)) throw new Error('Argument <address> is not a valid IPv4 address.');

  var 
    info = { 
      address: null, netmask: null, cidr: null, hostmask: null, 
      network: null, class: null, broadcast: null, 
      size: null, first: null, last: null 
    },
    parts = address.split('/'),
    long_ip = 0
    ;

  if(parts[0].indexOf('.') > 0) {
    long_ip = ip2long(parts[0]);    
  } else {
    long_ip = parseInt(parts[0], 10 );
  }

  info.address = long2ip(long_ip);

  if(parts.length > 1) {
    var mask_bits = 0;
    var long_netmask = 0;

    if(parts[1].indexOf('.') > 0) {
      long_netmask = ip2long(parts[1]);

      for(var i=0; i <32; i++) {
        if(long_netmask == 0xFFFFFFFF << (32 - i) >>> 0) {
          mask_bits = i;
          break;
        }
      }
    } else {
      mask_bits = parseInt(parts[1], 10 );
      long_netmask = 0xFFFFFFFF << (32 - mask_bits) >>> 0;
    }

    var long_network = (long_ip & long_netmask) >>> 0;


    info.netmask = long2ip(long_netmask);
    info.cidr = mask_bits;
    info.hostmask = long2ip(~long_netmask)

    info.network = long2ip(long_network);

    info.size = Math.pow(2, 32 - mask_bits);

    // Class A=0-127, Class B=128-191, Class C=192-223
    var firstOcted = long_ip >>> 24;
    if(firstOcted <= 127) {
      info.class='A';
    } else if(firstOcted <= 191) {
      info.class='B';
    } else if(firstOcted <= 223) {
      info.class='C';
    }

    info.broadcast = (mask_bits <= 30) ? long2ip(long_network + info.size - 1) : null ;

    info.first = (mask_bits <= 30) ? long2ip(long_network + 1) : info.network;
    info.last = (mask_bits <= 30) ? long2ip(long_network + info.size - 2) : long2ip(long_network + info.size - 1);
  }

  return info;
}
