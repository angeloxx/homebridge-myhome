const debug = require('debug')('myhomeclient')  
const sprintf = require("sprintf-js").sprintf;
const net = require('net'), promise = require('promise');
const crypto = require('crypto');
const sha256 = require('sha256'), sha1 = require('sha1');

/*
 * You can test and debug with 
 * DEBUG=myhomeclient node script.js
 */

class MyHomeClient {

    constructor(_ipaddress, _port, _password, _classToCallback) {
        // Ten level translation, 0=0=Off, 1 = 100=On, 2=1%, 3=10%, 4=20%...8=60%,9=75,10=100%
        this.dimmerLevels = [0,100,1,10,20,30,40,50,60,75,100];
        this.onLightWhite = null;
        this.onLightColor = null;
        this.onThermostat = null;
        this.buffers = {};
        this.ipaddress = _ipaddress;
        this.password = _password;
        this.port = _port;
        this.parent = _classToCallback;
        this.command = new MyHomeConnection(this.ipaddress, this.port, this.password, "COMMAND", this.onConnect.bind(this), this.onCommand.bind(this));
        this.monitor = new MyHomeConnection(this.ipaddress, this.port, this.password, "MONITOR", null, this.onMonitor.bind(this));
    }

    send(_command) {
        this.command.send(_command);
    }

    _slashesToAddress(_address) {
        var address = _address.split("/"); 
        if (address.length != 3) return "";

        var b = parseInt(address[0]), a = parseInt(address[1]), pl = parseInt(address[2]);

        if (b == 0) {
            if (a >= 10 || pl >= 10) {
                return sprintf("%02d%02d",a,pl);
            }
            return sprintf("%d%d",a,pl);
        } else {
            if (a >= 10 || pl >= 10) {
                return sprintf("%02d%02d#4#%02d",a,pl,b);
            }
            return sprintf("%d%d#4#%02d",a,pl,b);
        }
    }

    _addressToSlashes(_address) {
        if (_address.length == 4) return sprintf("0/%d/%d", parseInt(_address.substring(0,2)),parseInt(_address.substring(2,4)))
        if (_address.length == 2) return sprintf("0/%d/%d", parseInt(_address.substring(0,1)),parseInt(_address.substring(1,2)))
        // TODO
        return "9/99/99";
    }

    /*
     * Avoid repeated calls of the same command on a short time, it can happen with the dimmer control on iOS 
     * It buffer the commands and sends the last one.
     */
    _bufferCommand(_address,_command, _timeout) {
        if (this.buffers['address'] != null) {
            clearTimeout(this.buffers['address']);
        }
        this.buffers['address'] = setTimeout(function() {
            this.command.send(_command);
            delete(this.buffers['address']);
        }.bind(this), _timeout);
    }

    relayCommand(_address,_on) {
        var address = this._slashesToAddress(_address);
        if (address == "") return;
        this.command.send(sprintf("*1*%d*%s##",(_on)?1:0,address));
    }

    dimmerCommand(_address,_bri) {
		// 2013.04.12 - angeloxx - LG explains speed parameter of the *#1*<where>*#1*<level>*<speed> OWN frame
		// Speed is the single-step-time in 10ms scale. So the ramp time is:
		// time = <speed> * 10ms * <delta>, where delta is abs(currentlevel-finallevel).
	    // speed = (<time(ms)> / 10ms) / <delta>, delta level is [current|final]level*1000, ramptime is in ms
        
        var address = this._slashesToAddress(_address);
        if (address == "") return;

        if (_bri > 0) {
            this._bufferCommand(address,sprintf("*#1*%s*#1*%s*1##",address,_bri+100),500);
        } else {
            this._bufferCommand(address,sprintf("*1*0*%s##",address),500);
        }
    }

    onConnect() {
        this.command.send("*#1*0##");
    }

    onMonitor(_frame) {
        // Split frame (TODO: and join it if is a long one that is splitted in multiple input)
        var frames = _frame.split("##");
        frames.forEach(function(frame) {
            if (this.parent != null && this.parent.onMonitor != null && typeof(this.parent.onMonitor) == 'function') this.parent.onMonitor(_frame);

            var extract;
            /* Try to decode... */


            extract = _frame.match(/^\*1\*(\d+)\*([0-9#]+)##$/);
            if (extract) {
                var address = this._addressToSlashes(extract[2]);
                if (extract[1] <= 1) {
                    if (this.parent != null && this.parent.onMonitor != null && typeof(this.parent.onRelay) == 'function') this.parent.onRelay(address,extract[1] == 1);
                    debug(sprintf("%s %s",extract[0],address));
                } else {
                    if (this.parent != null && this.parent.onMonitor != null && typeof(this.parent.onDimmer) == 'function') this.parent.onDimmer(address,this.dimmerLevels[parseInt(extract[1],10)]);
                }
                
            }
        }.bind(this));
        

    }
    onCommand(_frame) {
        /* Who cares? */
    }
}

/*
 * TODO: Reconnect and error messages
 */

class MyHomeConnection {
	constructor(_ipaddress, _port, _password, _type, _onconnectcallback, _onmessagecallback) {
        this.ipaddress = _ipaddress;
        this.password = _password;
        this.type = _type;
        this.port = _port;
        this.state = 0;
        this.expected = "";
        this.isConnected = false;
        this.buffer = [];
        this.onconnect = _onconnectcallback;
        this.onmessage = _onmessagecallback;

        /* Keepalive frame on command connection every 25 seconds */
        if (this.type == "COMMAND") {
            setInterval(function(){ this.sendKeepalive(); }.bind(this), 25 * 1000);   
        }
        
        this.connection = net.connect({ host: this.ipaddress, port: parseInt(_port) }, () => {
            this.connection.on('data', (_in) => {
                var data = _in.toString().trim();
                debug('Received[%s]: <%s>', this.type, data)  
                if (this.state == 0 && data == "*#*1##") {
                    /*
                     * Great, answers and is ready to talk with me, I send
                     * a proposal for command connection because we like to split
                     * commands and answers
                     */
                    this.state = 1;
                    if (this.type == "COMMAND") this.write("*99*0##");
                    if (this.type == "MONITOR") this.write("*99*1##");

                } else if (this.state == 1 && data == "*#*1##") {
                    /*
                     * Free beer and party, the connection is unauthenticated
                     */
                    this.state = 100;
                    this.isConnected = true;
                    debug('Info[%s]: Unauthenticated connection', this.type);
                } else if (this.state == 1 && data == "*98*2##") {
                    /* HMAC is supported, ok let's try */
                    this.state = 10;
                    this.write("*#*1##");
                    debug('Info[%s]: HMAC Supported, start phase 1', this.type);
                } else if (this.state == 10) {
                    /* RA offered, we can calc answer */
                    this.state = 11;
                    var ra = data.substring(2,data.length-2);
                    var hmac = this.calcHMAC(ra);
                    this.write(hmac);
                    debug('Info[%s]: HMAC Supported, proceed with phase 2', this.type);
                } else if (this.state == 11) {
                    if (data == this.answer) {
                        /* Yeah, connection is up! */
                        this.state = 100;
                        this.write("*#*1##");
                        this.buffer.forEach(function(item, index, object) {
                            this.write(this.buffer[index]);
                            this.buffer.splice(index, 1);
                        }.bind(this));
                        this.isConnected = true;
                        debug('Send[%s]: HMAC Supported, phase 3 with success', this.type);

                        /* Send status request? */
                        if (this.type == "COMMAND" && this.onconnect != null) this.onconnect();
                    } else {
                        debug('Wrong[%s]: expected <%s>', this.type, this.answer);
                        debug('Info[%s]: HMAC Supported, phase 3 with failure', this.type);
                    }
                } else if (this.state == 100) {
                    if (this.onmessage != null) this.onmessage(data);
                }
            });
        });
    }

    write(_in) {
        debug('Write[%s]: <%s>', this.type, _in);
        this.connection.write(_in);
    }

    send(_in) {
        if (this.isConnected) {
            debug('Send[%s]: <%s>', this.type, _in);
            this.connection.write(_in);
        } else {
            debug('Buffer[%s]: <%s>', this.type, _in);
            this.buffer.push(_in);
        }
    }

    sendKeepalive() {
        debug('Keealive[%s]: send keepalive', this.type);
        if (this.isConnected) this.connection.write("*#13**15##");
    }

    calcHMAC(_in) {
        if (_in.length == 80) {
            /* TODO: SHA1 */
        } else if (_in.length == 128) {
            var rb = crypto.createHmac('sha256', "pimperepettenusa").digest('hex');
            var message = sha256(this.digitToHex(_in)+rb+"736F70653E"+"636F70653E"+sha256(this.password));
            this.answer  = sprintf("*#%s##", this.hexToDigit(sha256(this.digitToHex(_in)+rb+sha256(this.password)))).trim();
            return sprintf("*#%s*%s##", this.hexToDigit(rb),this.hexToDigit(message));
        }
    }

    digitToHex(_in) {
        var out = "";
        for (var i = 0; i < _in.length; i = i+4) {
            out = out + (parseInt(_in[i])*10+parseInt(_in[i+1])).toString(16) + (parseInt(_in[i+2])*10+parseInt(_in[i+3])).toString(16);
        }
        return out;
    }

    hexToDigit(_in) {
        var out = "";
        for (var i = 0; i < _in.length; i++) {
            out = out + sprintf("%d%d", parseInt(_in[i],16)/10,parseInt(_in[i],16)%10);
        }
        return out;
    }
}
module.exports.MyHomeClient = MyHomeClient;
