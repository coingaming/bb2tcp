/*jslint node: true */
"use strict";
var fs      = require('fs');
var db      = require('byteballcore/db.js');
var config  = require('byteballcore/conf.js');
var device  = require('byteballcore/device.js');
var events  = require('byteballcore/event_bus.js');
var wallet  = require('byteballcore/wallet.js');
var deskap  = require('byteballcore/desktop_app.js');
var crypto  = require('crypto');
var mypack  = require('./package.json');
var spawn   = require('child_process').spawn;

var DATADIR = deskap.getAppDataDir();
var KEYFILE = DATADIR + '/' + config.KEYS_FILENAME;
var RETRIES = 1;
var RUNNING = false;

function warn(text) {
    console.log("\x1B[1;31m"+text+"\x1B[0m");
}

function alert(text) {
    console.log("\x1B[1;33m"+text+"\x1B[0m");
}

function notify(text) {
    console.log("\x1B[1;32m"+text+"\x1B[0m");
}

function send_greeting(deviceAddress) {
    device.sendMessageToDevice(deviceAddress, 'text',
        'Byteball-to-TCP Proxy v'+ mypack.version + '\n'
       +'-------------------------------------------------------------\n'
       +'Author:  @hyena from byteball.slack.com\n'
       +'Source:  https://github.com/heathmont/bb2tcp\n'
       +'-------------------------------------------------------------\n');

    device.sendMessageToDevice(deviceAddress, 'text',
        'Welcome, '+deviceAddress+'!\n'
       +'You are now connected to tcp://'+config.TCP_HOST+':'+config.TCP_PORT+'.\n');
}

function read_keys(on_done){
    fs.readFile(KEYFILE, 'utf8', function(err, data){
        if (err){
            warn('Failed to read keys, will generate.');
            var dev_privkey           = crypto.randomBytes(32);
            var dev_temp_privkey      = crypto.randomBytes(32);
            var dev_prev_temp_privkey = crypto.randomBytes(32);
            write_keys (dev_privkey, dev_temp_privkey, dev_prev_temp_privkey, function(){
                on_done(dev_privkey, dev_temp_privkey, dev_prev_temp_privkey);
            });
            return;
        }
        var keys = JSON.parse(data);
        on_done(Buffer(keys.permanent_priv_key, 'base64'),
                Buffer(keys.temp_priv_key,      'base64'),
                Buffer(keys.prev_temp_priv_key, 'base64'));
    });
}

function write_keys(dev_privkey, dev_temp_privkey, dev_prev_temp_privkey, on_done){
    var keys = {
	    permanent_priv_key: dev_privkey          .toString('base64'),
	    temp_priv_key:      dev_temp_privkey     .toString('base64'),
	    prev_temp_priv_key: dev_prev_temp_privkey.toString('base64')
    };
    notify("Writing keys to "+KEYFILE+".");
    fs.writeFile(KEYFILE, JSON.stringify(keys), 'utf8', function(err){
        if (err) {
            if (err.code !== "ENOENT") throw Error("Failed to write keys file."+err.toString());
            if (RETRIES-- > 0) init();
            return;
        }
        if (on_done) on_done();
    });
}

function get_byte_count(s) {
    return encodeURI(s).split(/%..|./).length - 1;
}

function init() {
    if (!config.permanent_pairing_secret) {
        throw Error('No config.permanent_pairing_secret defined!');
    }

    {
        var query = "INSERT "+db.getIgnore()+" INTO pairing_secrets "
                  + "(pairing_secret, expiry_date, is_permanent) "
                  + "VALUES(?, '2035-01-01', 1)";
        db.query(query, [config.permanent_pairing_secret]);
    }

    read_keys(function(dev_privkey, dev_temp_privkey, dev_prev_temp_privkey){
        alert("Done reading keys.");
        var save_temp_keys = function(new_temp_key, new_prev_temp_key, on_done){
            write_keys(dev_privkey, new_temp_key, new_prev_temp_key, on_done);
        };
        device.setDevicePrivateKey(dev_privkey);
        device.setTempKeys(dev_temp_privkey, dev_prev_temp_privkey, save_temp_keys);
        device.setDeviceName(config.deviceName);
        device.setDeviceHub(config.hub);
        var my_device_pubkey = device.getMyDevicePubKey();
        console.log("\x1B[1;33mPublic key\x1B[0m:   "+my_device_pubkey);
        console.log("\x1B[1;32mPairing code\x1B[0m: "+my_device_pubkey+"@"+config.hub+"#"+config.permanent_pairing_secret);
        RUNNING = true;
    });
}

function main() {
    if (!RUNNING) {
        notify("Initializing...");
        setTimeout(function(){ main(); }, 1000);
        return;
    }

    events.on('paired', function (device_addr) {
        send_greeting(device_addr);
    });

    events.on('text', function (device_addr, text) {
        console.log("\x1B[1;32mReceived \x1B[1;37m"+(get_byte_count(text))+"\x1B[1;32m bytes from \x1B[1;33m"+device_addr+"\x1B[1;32m device.\x1B[0m");
        var printf = spawn('printf', ['%s', text]);
        var netcat = spawn('nc',     ['-q', '60', '-w', '60', config.TCP_HOST, config.TCP_PORT]);
        printf.stdout.pipe(netcat.stdin);
        netcat.stdout.on('data', function(chunk) {
            console.log("\x1B[1;31mSent \x1B[1;37m"+(chunk.byteLength)+"\x1B[1;31m bytes to \x1B[1;33m"+device_addr+"\x1B[1;31m device.\x1B[0m");
            device.sendMessageToDevice(device_addr, 'text', chunk.toString('utf8'));
        });
    });

    notify("TCP Proxy is ready to rock!");
}

init();
main();

