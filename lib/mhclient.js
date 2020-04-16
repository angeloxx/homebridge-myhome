/*jshint esversion: 6,node: true,-W041: false */
const debug = require('debug')('myhomeclient');
const sprintf = require("sprintf-js").sprintf;
const net = require('net');
const crypto = require('crypto');
const sha256 = require('sha256');
const moment = require('moment');


function inArray(needle, haystack) {
    var length = haystack.length;
    for (var i = 0; i < length; i++) {
        if (haystack[i] == needle)
            return true;
    }
    return false;
}
/*
 * You can test and debug with 
 * DEBUG=myhomeclient node script.js
 */

class MyHomeClient {

    constructor(_ipaddress, _port, _password, _setclock, _classToCallback) {
        // Ten level translation, 0=0=Off, 1 = 100=On, 2=1%, 3=10%, 4=20%...8=60%,9=75,10=100%
        this.dimmerLevels = [0, 100, 1, 10, 20, 30, 40, 50, 60, 75, 100];
        this.buffers = {};
        this.lightBuses = [];
        this.ipaddress = _ipaddress;
        this.password = _password;
        this.port = _port;
        this.setclock = _setclock;
        this.parent = _classToCallback;
    }

    start() {
        this.monitor = new MyHomeConnection(this.ipaddress, this.port, this.password, "MONITOR", null, this.onMonitor.bind(this), null);
        this.command = new MyHomeConnection(this.ipaddress, this.port, this.password, "COMMAND", this.onCommandConnect.bind(this), this.onCommand.bind(this), this.setclock);
    }

    /**
     * Fill the this.lightBuses array to know how many bus(es) should be polled at the startup
     */
    addLightBusDevice(_address) {
        var address = _address.split("/");
        if (address.length != 3) return "";

        // Add this bus if it wasn't already in list
        if (!inArray(address[0], this.lightBuses)) this.lightBuses.push(address[0]);
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
                return sprintf("%02d%02d", a, pl);
            }
            else
                if (pl == 0)
                    return sprintf("%d", a);
                else
                    return sprintf("%d%d", a, pl);
        }
        else {
            if (a >= 10 || pl >= 10) {
                return sprintf("%02d%02d#4#%02d", a, pl, b);
            }
            return sprintf("%d%d#4#%02d", a, pl, b);
        }
    }

    _addressToSlashes(_address) {
        if (_address.length == 4) return sprintf("0/%d/%d", parseInt(_address.substring(0, 2)), parseInt(_address.substring(2, 4)));
        if (_address.length == 2) return sprintf("0/%d/%d", parseInt(_address.substring(0, 1)), parseInt(_address.substring(1, 2)));
        if (_address.length == 1) return sprintf("0/%d/0", parseInt(_address));
        // TODO
        return "9/99/99";
    }

    /*
     * Avoid repeated calls of the same command on a short time, it can happen with the dimmer control on iOS 
     * It buffer the commands and sends the last one.
     */
    _bufferCommand(_class, _address, _command, _timeout) {
        if (this.buffers[sprintf("%s-%s", _class, _address)] != null) {
            clearTimeout(this.buffers[sprintf("%s-%s", _class, _address)]);
        }
        this.buffers[sprintf("%s-%s", _class, _address)] = setTimeout(function () {
            this.command.send(_command);
            delete (this.buffers[sprintf("%s-%s", _class, _address)]);
        }.bind(this), _timeout);
    }

    relayCommand(_address, _on) {
        var address = this._slashesToAddress(_address);
        if (address == "") return;
        this.command.send(sprintf("*1*%d*%s##", (_on) ? 1 : 0, address));
    }

    relayTimedOn(_address, hh, mm, ss) {
        var address = this._slashesToAddress(_address);
        if (address == "") return;
        this.command.send(sprintf("*#1*%s*#2*%d*%d*%d##", address, hh, mm, ss));
    }

    simpleBlindCommand(_address, _stopUpDown) {
        var address = this._slashesToAddress(_address);
        if (address == "") return;

        /* Send a starting stop */
        if (_stopUpDown != 0) {
          this.command.send(sprintf("*2*%d*%s##", 0, address));
        }
        //this.command.send(sprintf("*2*%d*%s##", parseInt(_stopUpDown), address));
        this._bufferCommand("BLIND", address, sprintf("*2*%d*%s##", parseInt(_stopUpDown), address), 500);
    }

    advancedBlindCommand(_address, _shutterLevel) {
        var address = this._slashesToAddress(_address);
        if (address == "") return;

        this.command.send(sprintf("*#2*%s*#11#1*%d##", address, parseInt(_shutterLevel)));
    }

    dimmerCommand(_address, _bri) {
        // 2013.04.12 - angeloxx - LG explains speed parameter of the *#1*<where>*#1*<level>*<speed> OWN frame
        // Speed is the single-step-time in 10ms scale. So the ramp time is:
        // time = <speed> * 10ms * <delta>, where delta is abs(currentlevel-finallevel).
        // speed = (<time(ms)> / 10ms) / <delta>, delta level is [current|final]level*1000, ramptime is in ms

        var address = this._slashesToAddress(_address);
        if (address == "") return;

        if (_bri > 0) {
            this._bufferCommand("DIMMER", address, sprintf("*#1*%s*#1*%s*1##", address, _bri + 100), 500);
        } else {
            this._bufferCommand("DIMMER", address, sprintf("*1*0*%s##", address), 500);
        }
    }

    forcedLoadCommand(_address, _forced) {
        if (_address == "") return;
        if (_forced == 1)
            this.command.send(sprintf("*3*2*#%d##", _address));
    }

    enableScenarioCommand(_address, _status) {
        if (_address == "") return;
        this.command.send(sprintf("*17*%d*%s##", (_status) ? 3 : 4, _address));
    }

    runScenarioCommand(_address, _status) {
        if (_address == "") return;
        this.command.send(sprintf("*17*%d*%s##", (_status) ? 1 : 2, _address));
    }

    setSetPoint(_address, _temperature) {
        // Standard thermostat *4*40*%02d##*#4*#%02d*#14*%04d*3
        this._bufferCommand("THERMO", _address, sprintf("*4*40*%02d##*#4*#%02d*#14*%04d*3##*#4*%02d*14##", _address, _address, _temperature * 10, _address), 500);
        // 4 Zones *#4*#0#%02d*#14*%04d*3
    }

    /**
     * Notify the availability of command connection to the client and
     * sends a light status request for all known buses
     */
    onCommandConnect() {
        this.lightBuses.forEach(function (element) {
            if (element == 0) {
                this.command.send("*#1*0##");
            } else {
                this.command.send(sprintf("*#1*0#4#%02d##", element));
            }
        }, this);

        //request also AUX states
        this.command.send("*#9##");

        //request also controlled load states
        this.command.send("*#3##");

        /* Light status well keep some seconds, so I prefer to wait to send the connect feedback */
        setTimeout(function () {
            if (this.parent != null && this.parent.onConnect != null && typeof (this.parent.onConnect) == 'function') this.parent.onConnect();
        }.bind(this), this.lightBuses.length * 2500);
    }

    onMonitor(_frame) {
        // Split frame (TODO: and join it if is a long one that is splitted in multiple input)
        var frames = _frame.split("##");
        frames.forEach(function (frame) {
            if (frame == "") return;
            if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onMonitor) == 'function') this.parent.onMonitor(frame);

            /* Try to decode as... */
            var extract;

            /* Light level */
            extract = frame.match(/^\*1\*(\d+)\*([0-9#]+)$/);
            if (extract) {
                let address = this._addressToSlashes(extract[2]);
                if (extract[1] <= 1) {
                    if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onRelay) == 'function') this.parent.onRelay(address, extract[1] == 1);
                    debug(sprintf("LIGHTLEVEL %s ADDRESS %s", extract[1], address));
                } else
                    if (parseInt(extract[1], 10) <= 10) {
                        if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onDimmer) == 'function') this.parent.onDimmer(address, this.dimmerLevels[parseInt(extract[1], 10)]);
                    }
            }

            /* Relay time duration */
            // *#1*12*2*190*1*5##>
            extract = frame.match(/^\*#1\*([0-9#]+)\*2\*(\d+)\*(\d+)\*(\d+)$/);
            if (extract) {
                let address = this._addressToSlashes(extract[1]);
                if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onRelayDuration) == 'function')
                    this.parent.onRelayDuration(address, parseInt(extract[2], 10) * 3600 + parseInt(extract[3], 10) * 60 + parseInt(extract[4], 10));
            }

            /* Light level - Advanced (VantageControls) way */
            // *#1*12*1*190*1##>
            extract = frame.match(/^\*#1\*([0-9#]+)\*\d\*(\d+)\*\d+$/);
            if (extract) {
                let address = this._addressToSlashes(extract[1]);
                if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onDimmer) == 'function') this.parent.onDimmer(address, parseInt(extract[2], 10) - 100);
            }


            /* Simple (F411) Blind */
            extract = frame.match(/^\*2\*(\d)\*([0-9#]+)$/);
            if (extract) {
                let address = this._addressToSlashes(extract[2]);
                debug(sprintf("BLIND %s ADDRESS %s", extract[1], address));
                if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onSimpleBlind) == 'function') this.parent.onSimpleBlind(address, parseInt(extract[1], 10));
            }

            /* Advanced (F401) Blind (on stop) */
            extract = frame.match(/^\*#2\*([0-9#]+)\*10\*(\d+)\*(\d+)\*\d+\*\d+$/);
            if (extract) {
                let address = this._addressToSlashes(extract[1]);
                let position = parseInt(extract[3], 10);
                let direction = "STOP";

                if (parseInt(extract[2], 10) == 11) direction = "UP";
                if (parseInt(extract[2], 10) == 12) direction = "DOWN";

                debug(sprintf("ADVANCEDBLIND %s/%s ADDRESS %s", position, direction, address));
                if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onSimpleBlind) == 'function') this.parent.onAdvancedBlind(address, direction, position);
            }

            /* Ambient temperature */
            extract = frame.match(/^\*#4\*(\d+)\*[0|14]\*(\d\d\d\d)$/);
            if (extract) {
                let address = parseInt(extract[1]);
                let temperature = parseFloat(extract[2] / 10);
                if (temperature > 100) {
                    temperature = -(temperature - 100);
                }
                if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onThermostat) == 'function') this.parent.onThermostat(address, "AMBIENT", temperature);
                debug(sprintf("AMBIENT %s ADDRESS %s", temperature, address));
            }

            /* Setpoint temperature */
            extract = frame.match(/^\*#4\*(\d+)\*12\*(\d\d\d\d)\*(\d+)$/);
            if (extract) {
                let address = parseInt(extract[1]);
                let temperature = parseFloat(extract[2] / 10);
                if (temperature > 100) {
                    temperature = -(temperature - 100);
                }
                if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onThermostat) == 'function') this.parent.onThermostat(address, "SETPOINT", temperature);
                debug(sprintf("SETPOINT %s ADDRESS %s", temperature, address));
            }

            // External sensor (see http://www.myopen-legrandgroup.com/community/italian_my_open/italian_65536/f/152/p/1476/7590.aspx#7590)
            // Format *#4*<address>00*15*1*<temp-%04d>*0001##
            extract = frame.match(/^\*#4\*(\d+)00\*15\*1\*(\d\d\d\d)\*0001$/);
            if (extract) {
                let address = parseInt(extract[1]);
                let temperature = parseFloat(extract[2] / 10);
                if (temperature > 100) {
                    temperature = -(temperature - 100);
                }
                if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onThermometer) == 'function') this.parent.onThermometer(address, "AMBIENT", temperature);
                debug(sprintf("EXT-AMBIENT %s ADDRESS %s", temperature, address));
            }

            // new regex:thActuators = RegEx_Create( \"^\*#4\*(\d{1,2})\*19\*(\d)\*(\d)$" );
            extract = frame.match(/^\*#4\*(\d+)\*19\*(\d)\*(\d)$/);
            if (extract) {
                let address = parseInt(extract[1]);
                let cooling = inArray(extract[2], [1, 2]);
                let heating = inArray(extract[3], [1, 2]);
                if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onThermostat) == 'function') this.parent.onThermostat(address, "HEATING", heating);
                if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onThermostat) == 'function') this.parent.onThermostat(address, "COOLING", cooling);
                debug(sprintf("HEATING %s COOLING %s ADDRESS %s", heating, cooling, address));
            }

            // *#4*<where>#<actuator>*20*<status>##
            extract = frame.match(/^\*#4\*(\d+)#\d\*20\*\d$/);
            if (extract) {
                /* Actuator command, asks for status */
                this.command.send(sprintf("*#4*19*%d##", extract[1]));
            }

            // DRYCONTACT: 	*25*31#[0-1]*3<where>##   -> Close (0 after a state request, 1 after an event) -> TRUE
            // 				*25*32#[0-1]*3<where>##   -> Open  (0 after a state request, 1 after an event) -> FALSE
            extract = frame.match(/^\*25\*3(\d)#[0-1]\*3(\d+)$/);
            if (extract) {
                let value = parseInt(extract[1], 10) == 1 ? true : false;
                let address = parseInt(extract[2], 10);
                if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onDryContact) == 'function') this.parent.onDryContact(address, value);
                debug(sprintf("DRYCONTACT %s ADDRESS %s", value, address));
            }

            // AUX: 	*9*[0,9]*<where>##   OFF
            // AUX: 	*9*1*<where>##   ON
            extract = frame.match(/^\*9\*(\d)\*(\d)$/);
            if (extract) {
                let value = false;
                if (parseInt(extract[1], 10) == 0 || parseInt(extract[1], 10) == 9)
                    value = false;
                else
                    value = true;
                let address = parseInt(extract[2], 10);
                if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onAUX) == 'function')
                    this.parent.onAUX(address, value);
                debug(sprintf("AUX %s ADDRESS %s", value, address));
            }

            // Scenario: 	*17*1*<where>##   Start
            // Scenario: 	*17*2*<where>##   Stop
            // Scenario: 	*17*3*<where>##   Enable
            // Scenario: 	*17*4*<where>##   Disable
            extract = frame.match(/^\*17\*(\d)\*(\d+)$/);
            if (extract) {
                let value = false;
                let command = parseInt(extract[1], 10);
                if ((command == 3) || (command == 1))
                    value = true;
                let address = parseInt(extract[2], 10);
                if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onScenarioEnable) == 'function' && (command == 3 || command == 4))
                    this.parent.onScenarioEnable(address, value);
                if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onScenarioRun) == 'function' && (command == 1 || command == 2))
                    this.parent.onScenarioRun(address, value);
                debug(sprintf("Scenario %s ADDRESS %s", value, address));
            }

            //powermeter
            extract = frame.match(/^\*#3\*10\*3\*(\d+)$/);
            if (extract) {
                let value = parseInt(extract[1], 10);
                if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onPowerMeter) == 'function')
                    this.parent.onPowerMeter(value);
                debug(sprintf("Power %s W", value));
            }

            //
            //controlled load
            extract = frame.match(/^\*3\*(\d)\*#(\d)$/);
            if (extract) {
                let value = parseInt(extract[1], 10);
                let address = parseInt(extract[2], 10);
                if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onControlledLoad) == 'function')
                    this.parent.onControlledLoad(address, value);
            }

            //alarm status
            extract = frame.match(/^\*5\*(\d+)\*(0*)$/);
            if (extract) {
                let value = parseInt(extract[1], 10);
                switch (value) {
                    case 0: //maintenance
						if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onAlarmFault) == 'function')
                            this.parent.onAlarmFault(1);
                        break;
                    case 1: //active
						if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onAlarmFault) == 'function')
                            this.parent.onAlarmFault(0);
                        break;
                    case 8: //engaged
                        if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onAlarm) == 'function')
                            this.parent.onAlarm(1);
                        break;
                    case 9:  //disengaged
                        if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onAlarm) == 'function')
                            this.parent.onAlarm(3);
                        if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onAlarmTampered) == 'function')
                            this.parent.onAlarmTampered(0);
                        break;
                    case 4:
                    case 10:  //battery KO
                        if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onAlarmLowBattery) == 'function')
                            this.parent.onAlarmLowBattery(1);
                        break;
                    case 5:  //battery OK
                        if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onAlarmLowBattery) == 'function')
                            this.parent.onAlarmLowBattery(0);
                        break;
                    case 6: //no network
                        if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onAlarmNetwork) == 'function')
                            this.parent.onAlarmNetwork(0);
                        break;
                    case 7: //network ok
                        if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onAlarmNetwork) == 'function')
                            this.parent.onAlarmNetwork(1);
                        break;
                    default:
                }
            }


            //alarm triggered and zone selection
            extract = frame.match(/^\*5\*(\d+)\*#(\d)$/);
            if (extract) {
                let value = parseInt(extract[1], 10);
                switch (value) {
                    case 11: //zone active
                        if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onZoneActive) == 'function')
                            this.parent.onZoneActive(parseInt(extract[2], 10) - 1, true);
                        break;
                    case 18: //zone deactive
                        if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onZoneActive) == 'function')
                            this.parent.onZoneActive(parseInt(extract[2], 10) - 1, false);
                        break;
                    case 15:  //silent alarm
                    case 17:  //intrusion
                        if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onAlarm) == 'function')
                            this.parent.onAlarm(4);
                        break;
                    case 16: //tampering
                        if (this.parent != null && this.parent.onMonitor != null && typeof (this.parent.onAlarmTampered) == 'function')
                            this.parent.onAlarmTampered(1);
                        break;
                    default:
                }
            }
        }.bind(this));
    }

    getThermostatStatus(_address) {
        this.command.send(sprintf("*#4*%d##*#4*19*%d##", _address, _address));
    }

    getContactState(_address) {
        this.command.send(sprintf("*#25*3%d##", _address));
    }

    getScenarioState(_address) {
        this.command.send(sprintf("*#17*%d##", _address));
    }

    getRelayState(_address) {
        this.command.send(sprintf("*#1*%s##", this._slashesToAddress(_address)));
    }

    getRelayDuration(_address) {
        this.command.send(sprintf("*#1*%s*2##", this._slashesToAddress(_address)));
    }

    getAdvancedBlindState(_address) {
        this.command.send(sprintf("*#2*%s*10##", this._slashesToAddress(_address)));
    }

    getPower() {
        this.command.send("*#3*10*3##");
    }

    getAlarmState() {
        this.command.send("*#5*0##");

    }

    getControlledLoadState() {
        this.command.send("*#3##");
    }

    onCommand(_frame) {
        /* Who cares? */
    }
}

/*
 * TODO: Reconnect and error messages
 */

class MyHomeConnection {
    constructor(_ipaddress, _port, _password, _type, _onconnectcallback, _onmessagecallback, _setclock) {
        this.ipaddress = _ipaddress;
        this.password = _password;
        this.type = _type;
        this.port = parseInt(_port, 10);
        this.state = 0;
        this.expected = "";
        this.isConnected = false;
        this.buffer = [];
        this.onconnect = _onconnectcallback;
        this.onmessage = _onmessagecallback;
        this.lastcommandtime = 0;
        this.commandms = 50;
        this.timerhandle = null;
        this.reconnecthandle = null;
        this.disconnecthandle = null;
        this.setclock = _setclock;

        this.keepaliveSeconds = 25; /* Send keepalive command frame every 25 seconds    */
        this.idleSeconds = 55;      /* Drop idle/lost connections after 55 seconds      */
        this.reconnectSeconds = 5;  /* reconnect after 5 seconds                        */
        this.updateTimeSeconds = 3600;

        /* Keepalive frame on command connection every this.keepaliveSeconds seconds */
        if (this.type == "COMMAND") {
            setInterval(function () { this.sendKeepalive(); }.bind(this), this.keepaliveSeconds * 1000);
            if (this.setclock)
                setInterval(function () { this.updateDate(); }.bind(this), this.updateTimeSeconds * 1000);
        }

        this.connect();
    }

    connect() {
        this.connection = net.connect({ host: this.ipaddress, port: this.port }, () => { });

        if (this.reconnecthandle != null) { clearTimeout(this.reconnecthandle); this.reconnecthandle = null; }

        /* Disconnect after this.idleSeconds seconds of inactivity */
        if (this.disconnecthandle != null) clearTimeout(this.disconnecthandle);
        this.disconnecthandle = setTimeout(function () {
            debug('Info[%s]: Stale connection detected, drop it!', this.type);
            this.connection.end();
        }.bind(this), this.idleSeconds * 1000);

        this.connection.on('data', (_in) => {
            if (this.reconnecthandle != null) { clearTimeout(this.reconnecthandle); this.reconnecthandle = null; }

            /* Disconnect after this.idleSeconds seconds of inactivity */
            if (this.disconnecthandle != null) clearTimeout(this.disconnecthandle);
            this.disconnecthandle = setTimeout(function () {
                debug('Info[%s]: Stale connection detected, drop it!', this.type);
                this.connection.end();
            }.bind(this), this.idleSeconds * 1000);

            var data = _in.toString().trim();
            debug('Received[%s]: <%s>', this.type, data);
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
                debug('Info[%s]: Unauthenticated connection', this.type);

                this.state = 100;
                this.buffer.forEach(function (item, index, object) {
                    this.write(this.buffer[index]);
                    this.buffer.splice(index, 1);
                }.bind(this));
                this.isConnected = true;
                if (this.type == "COMMAND" && this.onconnect != null) this.onconnect();
            } else if (this.state == 1 && data.match(/^\*#\d{8,12}##$/)) {
                /* OPEN auth, there's a rosetta implementation that "can be used" */
                debug('Info[%s]: OWN Password Supported, try to answer', this.type);
                this.state = 21;
                this.write(sprintf("*#%s##", this.openwebnetAnswer(this.password, data.match(/^\*#(\d{8,12})##$/)[1])));
            } else if (this.state == 1 && data == "*98*2##") {
                /* HMAC is supported, ok let's try */
                this.state = 10;
                this.write("*#*1##");
                debug('Info[%s]: HMAC Supported, start phase 1', this.type);
            } else if (this.state == 10) {
                /* RA offered, we can calc answer */
                this.state = 11;
                var ra = data.substring(2, data.length - 2);
                var hmac = this.calcHMAC(ra);
                this.write(hmac);
                debug('Info[%s]: HMAC Supported, proceed with phase 2', this.type);
            } else if (this.state == 11) {
                if (data == this.answer) {
                    /* Yeah, connection is up! */
                    this.state = 100;
                    this.write("*#*1##");
                    this.buffer.forEach(function (item, index, object) {
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
            } else if (this.state == 21) {
                if (data == "*#*1##") {
                    debug('Info[%s]: OWN Password authenticated with success', this.type);
                    this.state = 100;
                    this.buffer.forEach(function (item, index, object) {
                        this.write(this.buffer[index]);
                        this.buffer.splice(index, 1);
                    }.bind(this));
                    this.isConnected = true;
                    if (this.type == "COMMAND" && this.onconnect != null) this.onconnect();
                } else {
                    debug('Info[%s]: OWN Password authenticated with FAILURE', this.type);
                }
            } else if (this.state == 100) {
                if (this.onmessage != null) this.onmessage(data);
            }
        });

        this.connection.on('close', (_error) => {
            this.state = 0;
            this.isConnected = false;
            if (this.reconnecthandle != null) clearTimeout(this.reconnecthandle);
            this.reconnecthandle = setTimeout(function () {
                debug('Info[%s]: Try to reconnect !', this.type);
                this.connect();
            }.bind(this), this.reconnectSeconds * 1000);
        });

        this.connection.on('error', (_error) => {
            this.state = 0;
            this.isConnected = false;
            if (this.reconnecthandle != null) clearTimeout(this.reconnecthandle);
            this.reconnecthandle = setTimeout(function () {
                debug('Info[%s]: Try to reconnect !', this.type);
                this.connect();
            }.bind(this), this.reconnectSeconds * 1000);
        });
    }

    /**
     * OWN Password implementation that can be found on the web, it seems to work
     */
    openwebnetAnswer(pass, nonce) {
        var _0x9148 = ["\x30", "\x31", "\x32", "\x33", "\x34", "\x35", "\x36", "\x37", "\x38", "\x39"]; var _0xba8b = [_0x9148[0], _0x9148[1], _0x9148[2], _0x9148[3], _0x9148[4], _0x9148[5], _0x9148[6], _0x9148[7], _0x9148[8], _0x9148[9]]; var flag = true; var num1 = 0x0; var num2 = 0x0; var password = parseInt(pass, 10); for (var c in nonce) { c = nonce[c]; if (c != _0xba8b[0]) { if (flag) { num2 = password; } flag = false; } switch (c) { case _0xba8b[1]: num1 = num2 & 0xFFFFFF80; num1 = num1 >>> 7; num2 = num2 << 25; num1 = num1 + num2; break; case _0xba8b[2]: num1 = num2 & 0xFFFFFFF0; num1 = num1 >>> 4; num2 = num2 << 28; num1 = num1 + num2; break; case _0xba8b[3]: num1 = num2 & 0xFFFFFFF8; num1 = num1 >>> 3; num2 = num2 << 29; num1 = num1 + num2; break; case _0xba8b[4]: num1 = num2 << 1; num2 = num2 >>> 31; num1 = num1 + num2; break; case _0xba8b[5]: num1 = num2 << 5; num2 = num2 >>> 27; num1 = num1 + num2; break; case _0xba8b[6]: num1 = num2 << 12; num2 = num2 >>> 20; num1 = num1 + num2; break; case _0xba8b[7]: num1 = num2 & 0x0000FF00; num1 = num1 + ((num2 & 0x000000FF) << 24); num1 = num1 + ((num2 & 0x00FF0000) >>> 16); num2 = (num2 & 0xFF000000) >>> 8; num1 = num1 + num2; break; case _0xba8b[8]: num1 = num2 & 0x0000FFFF; num1 = num1 << 16; num1 = num1 + (num2 >>> 24); num2 = num2 & 0x00FF0000; num2 = num2 >>> 8; num1 = num1 + num2; break; case _0xba8b[9]: num1 = ~num2; break; case _0xba8b[0]: num1 = num2; break; }num2 = num1; } return (num1 >>> 0).toString();
    }

    /**
     * Direct write
     */
    write(_in) {
        this.lastcommandtime = new Date();
        debug('Write[%s]: <%s>', this.type, _in);
        this.connection.write(_in);
    }

    /**
     * Process the command buffer
     */
    writeBuffer() {
        if (this.buffer.length > 0) {
            this.write(this.buffer.shift());
            if (this.buffer.length > 0) {
                this.timerhandle = setTimeout(function () {
                    this.writeBuffer();
                }.bind(this), this.commandms);
            } else {
                this.timerhandle = null;
            }
        } else {
            this.timerhandle = null;
        }
    }

    send(_in) {
        var frames = _in.split("##");
        frames.forEach(function (frame) {
            if (frame == "") return;
            frame = frame + "##";
            if (this.isConnected) {
                if (((new Date()) - this.lastcommandtime) > this.commandms) {
                    debug('Send[%s]: <%s>', this.type, frame);
                    this.write(frame);
                } else {
                    debug('Buffer[%s]: <%s>', this.type, frame);
                    this.buffer.push(frame);
                    if (this.timerhandle == null) {
                        this.timerhandle = setTimeout(function () {
                            this.writeBuffer();
                        }.bind(this), this.commandms);
                    }
                }
            } else {
                debug('Buffer[%s]: <%s>', this.type, frame);
                this.buffer.push(frame);
                if (this.timerhandle == null) {
                    this.timerhandle = setTimeout(function () {
                        this.writeBuffer();
                    }.bind(this), this.commandms);
                }
            }
        }, this);
    }

    sendKeepalive() {
        debug('Keealive[%s]: send keepalive', this.type);
        if (this.isConnected) {
            this.connection.write("*#13**15##");
        }
    }

    updateDate() {
        if (this.isConnected) {
            var setDateTimeFrame = moment().format("*#13**#22*HH*mm*ss*001*0d*DD*MM*YYYY##");
            this.connection.write(setDateTimeFrame);

        }
    }

    calcHMAC(_in) {
        if (_in.length == 80) {
            /* TODO: SHA1 */
        } else if (_in.length == 128) {
            var rb = crypto.createHmac('sha256', "pimperepettenusa").digest('hex');
            var message = sha256(this.digitToHex(_in) + rb + "736F70653E" + "636F70653E" + sha256(this.password));
            this.answer = sprintf("*#%s##", this.hexToDigit(sha256(this.digitToHex(_in) + rb + sha256(this.password)))).trim();
            return sprintf("*#%s*%s##", this.hexToDigit(rb), this.hexToDigit(message));
        }
    }

    digitToHex(_in) {
        var out = "";
        for (var i = 0; i < _in.length; i = i + 4) {
            out = out + (parseInt(_in[i]) * 10 + parseInt(_in[i + 1])).toString(16) + (parseInt(_in[i + 2]) * 10 + parseInt(_in[i + 3])).toString(16);
        }
        return out;
    }

    hexToDigit(_in) {
        var out = "";
        for (var i = 0; i < _in.length; i++) {
            out = out + sprintf("%d%d", parseInt(_in[i], 16) / 10, parseInt(_in[i], 16) % 10);
        }
        return out;
    }
}

module.exports.MyHomeClient = MyHomeClient;
