const debug = require('debug')('myhomeclient')  
const sprintf = require("sprintf-js").sprintf;
const net = require('net');
const crypto = require('crypto');
const sha256 = require('sha256'), sha1 = require('sha1');

/*
 * You can test and debug with 
 * DEBUG=myhomeclient node script.js
 */

class MyHomeClient {
    constructor(_ipaddress, _password) {
        this.ipaddress = _ipaddress;
        this.password = _password;
        this.command = new MyHomeConnection(this.ipaddress, this.password, "COMMAND");
        this.monitor = new MyHomeConnection(this.ipaddress, this.password, "MONITOR");
    }

    send(_command) {
        this.command.send(_command);

    }
}

class MyHomeConnection {
	constructor(_ipaddress, _password, _type) {
        this.ipaddress = _ipaddress;
        this.password = _password;
        this.type = _type;
        this.state = 0;
        this.expected = "";
        this.isConnected = false;
        this.buffer = [];
        
        this.connection = net.connect({ host: this.ipaddress, port: 20000 }, () => {
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
                } else if (this.state == 1 && data == "*98*2##") {
                    /* HMAC is supported, ok let's try */
                    this.state = 10;
                    this.write("*#*1##");
                } else if (this.state == 10) {
                    /* RA offered, we can calc answer */
                    this.state = 11;
                    var ra = data.substring(2,data.length-2);
                    var hmac = this.calcHMAC(ra);
                    this.write(hmac);
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
                    } else {
                        debug('Wrong[%s]: expected <%s>', this.type, this.answer);
                    }
                }
            });
        });
    }

    write(_in) {
        debug('Send[%s]: <%s>', this.type, _in);
        this.connection.write(_in);
    }

    send(_in) {
        if (this.isConnected) {
            this.connection.write(_in);
        } else {
            this.buffer.push(_in);
        }
    }

    calcHMAC(_in) {
        if (_in.length == 80) {


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

a = new MyHomeClient("192.168.157.213","12345");
a.send("*1*0*15##");