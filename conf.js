/*jslint node: true */
"use strict";

function replace_console_log(){
    var clog = console.log;
    console.log = function(){
	    Array.prototype.unshift.call(arguments, Date().toString().substring(0,24)+' ::');
	    clog.apply(null, arguments);
    }
}

replace_console_log();

exports.deviceName               = 'TCP Proxy';
exports.hub                      = 'byteball.org/bb';
exports.permanent_pairing_secret = '0000';
exports.bServeAsHub              = false;
exports.bLight                   = true;
exports.KEYS_FILENAME            = 'keys.json';
exports.TCP_HOST                 = 'india.colorado.edu';
exports.TCP_PORT                 = 13;

console.log('Finished conf.js of the TCP Proxy.');

