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
var net     = require('net');
var mypack  = require('./package.json');

var DATADIR = deskap.getAppDataDir();
var KEYFILE = DATADIR + '/' + config.KEYS_FILENAME;
var RETRIES = 1;
var RUNNING = false;
var TUNNELS = {};
var TO_HOST = config.TCP_HOST;
var TO_PORT = config.TCP_PORT;
var DEVNAME = config.deviceName;
var DEVDESC = null;
var OPENTXT = null;

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
    if (DEVDESC === null) {
        device.sendMessageToDevice(deviceAddress, 'text',
            'Byteball-to-TCP Proxy v'+ mypack.version + '\n'
           +'-------------------------------------------------------------\n'
           +'Author:  @hyena from byteball.slack.com\n'
           +'Source:  https://github.com/heathmont/bb2tcp\n'
           +'-------------------------------------------------------------\n');
    }
    else if (DEVDESC.length > 0) {
        device.sendMessageToDevice(deviceAddress, 'text', DEVDESC);
    }
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

function make_tunnel(device_addr) {
    var client = new net.Socket();
    client.byteball_device = device_addr;

    client.connect(TO_PORT, TO_HOST, function() {
        notify('Device '+client.byteball_device+' connected to '+TO_HOST+':'+TO_PORT+'.');
        TUNNELS[client.byteball_device].ready = true;
        if (OPENTXT !== null) {
            var str = OPENTXT.replace(/%s/g, client.byteball_device);
            TUNNELS[client.byteball_device].client.write(str);
        }
        update_tunnel(client.byteball_device);
    });

    client.on('data', function(data) {
        console.log("\x1B[1;31mSent \x1B[1;37m"+(data.byteLength)
                   +"\x1B[1;31m bytes to \x1B[1;33m"+client.byteball_device
                   +"\x1B[1;31m device.\x1B[0m");
        device.sendMessageToDevice(client.byteball_device, 'text', data.toString('utf8'));
    });

    client.on('close', function() {
        notify('Device '+client.byteball_device+' disconnected from '+TO_HOST+':'+TO_PORT+'.');
        device.sendMessageToDevice(client.byteball_device, 'text', '#Connection lost.');
        delete TUNNELS[client.byteball_device].client;
        TUNNELS[client.byteball_device].client = null;
        TUNNELS[client.byteball_device].ready  = false;
        TUNNELS[client.byteball_device].input  = [];
    });

    client.on('error', function(err) {
        warn('Failed to connect to '+TO_HOST+':'+TO_PORT+'.');
    });

    if (device_addr in TUNNELS) {
        TUNNELS[device_addr].client = client;
        TUNNELS[device_addr].ready  = false;
        return;
    }

    var tunnel = {};
    tunnel["client"] = client;
    tunnel["input"]  = [];
    tunnel["ready"]  = false;
    TUNNELS[device_addr] = tunnel;
}

function update_tunnel(device_addr) {
    if (!(device_addr in TUNNELS)) return;
    var tunnel = TUNNELS[device_addr];
    if (tunnel.client === null || tunnel.input.length === 0 || !tunnel.ready) return;
    tunnel.client.write(tunnel.input.join(""));
    tunnel.input = [];
}

function args() {
    var host = null;
    var port = null;
    var name = null;
    var desc = null;
    var open = null;
    var argc = 0;
    var arg0 = null;
    var arg1 = null;
    process.argv.forEach(function (val, index, array) {
             if (index === 0) arg0 = val;
        else if (index === 1) arg1 = val;
        else if (index === 2) host = val;
        else if (index === 3) port = val;
        else if (index === 4) name = val;
        else if (index === 5) desc = val;
        else if (index === 6) open = val;
        argc++;
    });
    if (host !== null && port !== null && /^\d+$/.test(port)) {
        port = parseInt(port);
        TO_HOST = host;
        TO_PORT = port;
        if (name !== null) DEVNAME = name;
        if (desc !== null) DEVDESC = desc;
        if (open !== null) OPENTXT = open;
    }
    if (argc > 2) return;
    notify("Example usage: "+arg0+" "+arg1+" <host> <port> <name> <desc> <open>");
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
        device.setDeviceName(DEVNAME);
        device.setDeviceHub(config.hub);
        var my_device_pubkey = device.getMyDevicePubKey();
        console.log("\x1B[1;33mPublic key\x1B[0m:   "+my_device_pubkey);
        console.log("\x1B[1;32mPairing code\x1B[0m: "+my_device_pubkey
                   +"@"+config.hub+"#"+config.permanent_pairing_secret);
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
        if (!(device_addr in TUNNELS) || TUNNELS[device_addr].client == null) make_tunnel(device_addr);
    });

    events.on('text', function (device_addr, text) {
        console.log("\x1B[1;32mReceived \x1B[1;37m"+(get_byte_count(text))
                   +"\x1B[1;32m bytes from \x1B[1;33m"+device_addr
                   +"\x1B[1;32m device.\x1B[0m");
        if (!(device_addr in TUNNELS) || TUNNELS[device_addr].client == null) make_tunnel(device_addr);
        TUNNELS[device_addr].input.push(text+"\n");
        update_tunnel(device_addr);
    });

    notify("TCP Proxy is ready to rock on "+TO_HOST+":"+TO_PORT+"!");
}

args();
init();
main();

