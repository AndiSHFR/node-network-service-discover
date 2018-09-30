/*!
 * get-ipv4-interfaces.js
 * Return a list of all interfaces with IPv4 addresses from this host.
 * 
 * Author: Andreas Schaefer <asc@schaefer-it.net>
 */
'use strict'

var os = require('os');

module.exports = function(excludeInternals) {
  var 
    // Get all network interfaces from the operation system
    allNetworkInterfaces = os.networkInterfaces(),
    // Turn the interfaces object into a list of interfaces and add the interface name to the object
    allNetworkInterfacesWithInterfaceName = Object.keys(allNetworkInterfaces).map(function(name) {
      var values = allNetworkInterfaces[name];
      values.forEach(function(v) { v.name = name; return v;});
      return values;
    }),
    // Filter interfaces w/o IPv4 addresses and optional exclude internal interfaces (localhost)
    ipv4NetworkInterfaces = [].concat.apply([], allNetworkInterfacesWithInterfaceName).filter(function(iface) { 
      return iface.family == 'IPv4' && !(excludeInternals && iface.internal == true); 
    })
    ;
  return ipv4NetworkInterfaces;
}
