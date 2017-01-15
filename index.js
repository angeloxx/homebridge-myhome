var path = require("path");	
var mh = require(path.join(__dirname,'/lib/mhclient'));
var sprintf = require("sprintf-js").sprintf, inherits = require("util").inherits, Promise = require('promise');
var events = require('events'), util = require('util'), fs = require('fs');
var Accessory, Characteristic, Service, UUIDGen;

module.exports = function (homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	Accessory = homebridge.platformAccessory;
	UUIDGen = homebridge.hap.uuid;

	inherits(MHRelay, Accessory);
	process.setMaxListeners(0);
	homebridge.registerPlatform("homebridge-myhome", "LegrandMyHome", LegrandMyHome);
};

class LegrandMyHome {
	constructor(log, config, api) {
		this.log = log;
		this.config = config || {};
		this.api = api;
		this.ready = false;
		this.devices = [];
		this.controller = new mh.MyHomeClient(config.ipaddress, config.port, config.ownpassword, this);
		this.config.devices.forEach(function (accessory) {
			this.log.info("LegrandMyHome: adds accessory");
			accessory.parent = this;
			if (accessory.accessory == 'MHRelay') this.devices.push(new MHRelay(this.log,accessory))
			if (accessory.accessory == 'MHBlind') this.devices.push(new MHBlind(this.log,accessory))
			if (accessory.accessory == 'MHOutlet') this.devices.push(new MHRelay(this.log,accessory))
			if (accessory.accessory == 'MHRelayLight') this.devices.push(new MHRelay(this.log,accessory))
			if (accessory.accessory == 'MHDimmer') this.devices.push(new MHDimmer(this.log,accessory))
			if (accessory.accessory == 'MHThermostat') this.devices.push(new MHThermostat(this.log,accessory))
			if (accessory.accessory == 'MHExternalThermometer') this.devices.push(new MHThermometer(this.log,accessory))
			if (accessory.accessory == 'MHContactSensor') this.devices.push(new MHContactSensor(this.log,accessory))
		}.bind(this));
		this.log.info("LegrandMyHome for MyHome Gateway at " + config.ipaddress + ":" + config.port);
		this.controller.start();
	}

	onMonitor(_frame) {

	}

	onConnect() {
		this.devices.forEach(function (accessory) {
			if (accessory.thermostatService !== undefined) this.controller.getThermostatStatus(accessory.address);
			if (accessory.contactSensorService !== undefined) this.controller.getContactState(accessory.address);
		}.bind(this));
	}

	onRelay(_address,_onoff) {
		this.devices.forEach(function(accessory) {
			if (accessory.address == _address && accessory.lightBulbService !== undefined) {
				accessory.power = _onoff;
				accessory.bri = _onoff * 100;
				accessory.lightBulbService.getCharacteristic(Characteristic.On).getValue(null);
			}
		}.bind(this));
	}

	onContactSensor(_address,_state) {
		this.devices.forEach(function(accessory) {
			if (accessory.address == _address && accessory.contactSensorService !== undefined) {
				accessory.state = _state;
				accessory.contactSensorService.getCharacteristic(Characteristic.ContactSensorState).getValue(null);
			}
		}.bind(this));
	}	

	onDimmer(_address,_level) {
		this.devices.forEach(function(accessory) {
			if (accessory.address == _address && accessory.lightBulbService !== undefined) {
				accessory.power = (_level > 0) ? 1 : 0;
				accessory.bri = _level;
				accessory.lightBulbService.getCharacteristic(Characteristic.On).getValue(null);
			}
		}.bind(this));
	}

	onSimpleBlind(_address,_value) {
		this.devices.forEach(function(accessory) {
			if (accessory.address == _address && accessory.windowCoveringService !== undefined) {
				switch (_value) {
					case 0:
						accessory.state = Characteristic.PositionState.STOPPED;
						accessory.evaluatePosition();
						break;
					case 1:
						accessory.state = Characteristic.PositionState.INCREASING;
						accessory.evaluatePosition();
						break;
					case 2:
						accessory.state = Characteristic.PositionState.DECREASING;
						accessory.evaluatePosition();
						break;
				}
				accessory.windowCoveringService.getCharacteristic(Characteristic.PositionState).getValue(null);
				accessory.windowCoveringService.getCharacteristic(Characteristic.CurrentPosition).getValue(null);
				accessory.windowCoveringService.getCharacteristic(Characteristic.TargetPosition).getValue(null);
			}
		}.bind(this));
	}

	onThermostat(_address,_measure,_level) {
		this.devices.forEach(function(accessory) {
			if (accessory.address == _address && accessory.thermostatService !== undefined) {
				if (_measure == "AMBIENT") {
					accessory.ambient = _level;
					accessory.thermostatService.getCharacteristic(Characteristic.CurrentTemperature).getValue(null);
				}
				if (_measure == "SETPOINT") {
					accessory.setpoint = _level;
					accessory.thermostatService.getCharacteristic(Characteristic.TargetTemperature).getValue(null);
				}
			}
		}.bind(this));		
	}

	onThermometer(_address,_measure,_level) {
		this.devices.forEach(function(accessory) {
			if (accessory.address == _address && accessory.thermometerService !== undefined) {
				if (_measure == "AMBIENT") {
					accessory.ambient = _level;
					accessory.thermometerService.getCharacteristic(Characteristic.CurrentTemperature).getValue(null);
				}
			}
		}.bind(this));		
	}	

	accessories(callback) {
		this.log.debug("LegrandMyHome (accessories readed)");
		callback(this.devices);
	}	
}

class MHRelay {
	constructor(log, config) {
		this.config = config || {};
		this.mh = config.parent.controller;
		this.name = config.name;
		this.address = config.address;
		this.displayName = config.name;
		this.UUID = UUIDGen.generate(sprintf("relay-%s",config.address));
		this.log = log;
		
		this.power = false;
		this.bri = 100;
		this.sat = 0;
		this.hue = 0;
		this.log.info(sprintf("LegrandMyHome::MHRelay create object: %s", this.address));
	}

	getServices() {
		var service = new Service.AccessoryInformation();
		service.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Legrand MyHome")
			.setCharacteristic(Characteristic.Model, "Relay")
			.setCharacteristic(Characteristic.SerialNumber, "Address " + this.address);

		switch (this.config.accessory) {
			case 'MHRelayOutlet':
				this.lightBulbService = new Service.Outlet(this.name);
				break;
		
			default:
				this.lightBulbService = new Service.Lightbulb(this.name);
				break;
		}

		this.lightBulbService.getCharacteristic(Characteristic.On)
			.on('set', (level, callback) => {
				this.log.debug(sprintf("setPower %s = %s",this.address, level));
				this.power = (level > 0);
				if (this.power && this.bri == 0) {
					this.bri = 100;
				}
				this.mh.relayCommand(this.address,this.power)
				callback(null);
			})
			.on('get', (callback) => {
				this.log.debug(sprintf("getPower %s = %s",this.address, this.power));
				callback(null, this.power);
			});
		return [service, this.lightBulbService];
	}
}

class MHBlind {
	constructor(log, config) {
		this.config = config || {};
		this.mh = config.parent.controller;
		this.name = config.name;
		this.address = config.address;
		this.displayName = config.name;
		this.time = config.time || 0;
		this.UUID = UUIDGen.generate(sprintf("blind--%s",config.address));
		this.log = log;
		
		this.runningStartTime = -1;
		this.runningDirection = Characteristic.PositionState.STOPPED;
		this.state = Characteristic.PositionState.STOPPED;
		this.currentPosition = 0;
		this.targetPosition = 0;
		this.startDelayMs = config.startDelayMs || 250; /* Start delay of the automation and MH relay */
		this.log.info(sprintf("LegrandMyHome::MHBlind create object: %s", this.address));
	}

	evaluatePosition() {
		if (this.runningDirection == Characteristic.PositionState.STOPPED && this.currentPosition != Characteristic.PositionState.STOPPED) {
			this.runningStartTime = new Date();
			this.runningDirection = this.state;
			this.log.debug(sprintf("Starting position is %d", this.currentPosition))
		} else {
			if (this.runningDirection != Characteristic.PositionState.STOPPED && this.state == Characteristic.PositionState.STOPPED) {
				if (this.runningDirection == Characteristic.PositionState.INCREASING) {
					this.currentPosition = Math.min(100,this.currentPosition + (100 / (this.time*1000) * ((new Date())-this.runningStartTime+this.startDelayMs)))
				} else {
					this.currentPosition = Math.max(0,this.currentPosition - (100 / (this.time*1000) * ((new Date())-this.runningStartTime+this.startDelayMs)))
				}
				this.runningDirection = this.state;
				this.targetPosition = this.currentPosition;
				this.runningStartTime = -1;

				this.log.debug(sprintf("Ending position is %d", this.currentPosition))
			} else {
				/* Uhm... */
			}
		}
	}

	/* Calc the needed time to go from Max to Min */
	evaluateTravelTimeMs(from,to) {
		if (this.time == 0) return -1;
		return ((this.time*1000) / 100 * Math.abs(from-to));
	}

	getServices() {
		var service = new Service.AccessoryInformation();
		service.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Legrand MyHome")
			.setCharacteristic(Characteristic.Model, "Blind")
			.setCharacteristic(Characteristic.SerialNumber, "Address " + this.address);

		this.windowCoveringService = new Service.WindowCovering(this.name);

		this.windowCoveringService.getCharacteristic(Characteristic.PositionState)
			.on('set', (value, callback) => {
				callback(null);
			})
			.on('get', (callback) => {
				this.log.debug(sprintf("getPositionState %s = %s",this.address, this.state));
				callback(null, this.state);
			});

		this.windowCoveringService.getCharacteristic(Characteristic.CurrentPosition)
			.on('set', (value, callback) => {
				callback(null);
			})
			.on('get', (callback) => {
				this.log.debug(sprintf("getCurrentPosition %s = %s",this.address, this.state));
				callback(null, this.currentPosition);
			});			

		this.windowCoveringService.getCharacteristic(Characteristic.TargetPosition)
			.on('set', (value, callback) => {
				this.targetPosition = value;
				var travelTimeMs = this.evaluateTravelTimeMs(this.currentPosition,this.targetPosition);
				if (value > this.currentPosition) {
					this.mh.simpleBlindCommand(this.address,1);
				} else {
					this.mh.simpleBlindCommand(this.address,2);
				}

				/* Use the calculated travel time only if the target isn't the complete Up or Complete Down */
				if (this.targetPosition > 0 && this.targetPosition < 100) {
					if (travelTimeMs > 0) {
						setTimeout(function() {
							this.mh.simpleBlindCommand(this.address,0);
						}.bind(this), travelTimeMs);
					}
				}
				callback(null);
			})
			.on('get', (callback) => {
				this.log.debug(sprintf("getTargetPosition %s = %s",this.address, this.state));
				callback(null, this.targetPosition);
			});

		return [service, this.windowCoveringService];
	}
}

class MHDimmer {
	constructor(log, config) {
		this.config = config || {};
		this.mh = config.parent.controller;
		this.name = config.name;
		this.address = config.address;
		this.displayName = config.name;
		this.UUID = UUIDGen.generate(sprintf("dimmer-%s",config.address));
		this.log = log;
		
		this.power = false;
		this.bri = 100;
		this.sat = 0;
		this.hue = 0;
		this.log.info(sprintf("LegrandMyHome::MHRelay create object: %s", this.address));
	}

	getServices() {
		var service = new Service.AccessoryInformation();
		service.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Legrand MyHome")
			.setCharacteristic(Characteristic.Model, "Dimmer")
			.setCharacteristic(Characteristic.SerialNumber, "Address " + this.address);

		this.lightBulbService = new Service.Lightbulb(this.name);

		this.lightBulbService.getCharacteristic(Characteristic.On)
			.on('set', (level, callback) => {
				this.log.debug(sprintf("setPower %s = %s",this.address, level));
				this.power = (level > 0);
				if (this.power && this.bri == 0) {
					this.bri = 100;
				}
				this.mh.relayCommand(this.address,this.power)
				callback(null);
			})
			.on('get', (callback) => {
				this.log.debug(sprintf("getPower %s = %s",this.address, this.power));
				callback(null, this.power);
			});

		this.lightBulbService.getCharacteristic(Characteristic.Brightness)
			.on('set', (level, callback) => {
				this.log.debug(sprintf("setBrightness %s = %d",this.address, level));
				this.bri = parseInt(level);
				this.power = (this.bri > 0);
				this.mh.dimmerCommand(this.address,this.bri)
				callback(null);
			})
			.on('get', (callback) => {
				this.log(sprintf("getBrightness %s = %d",this.address, this.bri));
				callback(null, this.bri);
			});			
		return [service, this.lightBulbService];
	}
}


class MHThermostat {
	constructor(log, config) {
		this.config = config || {};
		this.mh = config.parent.controller;
		this.name = config.name;
		this.address = config.address;
		this.displayName = config.name;
		this.UUID = UUIDGen.generate(sprintf("thermostat-%s",config.address));
		this.log = log;
		
		this.ambient = 0;
		this.setpoint = 20;
		this.mode = -1;
		this.log.info(sprintf("LegrandMyHome::MHThermostat create object: %s", this.address));
	}

	getServices() {
		var service = new Service.AccessoryInformation();
		service.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Legrand MyHome")
			.setCharacteristic(Characteristic.Model, "Thermostat")
			.setCharacteristic(Characteristic.SerialNumber, "Address " + this.address);

		this.thermostatService = new Service.Thermostat(this.name);
		this.thermostatService.getCharacteristic(Characteristic.CurrentTemperature).setProps({minValue: -50, minStep: 0.1, maxValue: 50})
			.on('get', (callback) => {
				this.log.debug(sprintf("getCurrentTemperature %s = %s",this.address, this.ambient));
				callback(null, this.ambient);
			});

		this.thermostatService.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
			.on('get', (callback) => {
				this.log.debug(sprintf("getCurrentHeatingCoolingState %s = %s",this.address, this.ambient));
				callback(null, Characteristic.CurrentHeatingCoolingState.HEAT);
			}).on('set', (value,callback) => {
				callback(null);
			});	

		this.thermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState)
			.on('get', (callback) => {
				this.log.debug(sprintf("getTargetHeatingCoolingState %s = %s",this.address, this.ambient));
				callback(null, Characteristic.TargetHeatingCoolingState.HEAT);
			}).on('set', (value,callback) => {
				this.log.debug(sprintf("getTargetHeatingCoolingState %s = %s",this.address, this.ambient));
				callback(null);
			});			

		this.thermostatService.getCharacteristic(Characteristic.TargetTemperature).setProps({minValue: 15, minStep:0.5, maxValue: 40})
			.on('set', (value, callback) => {
				this.log.debug(sprintf("setCurrentSetpoint %s = %s",this.address, value));
				this.mh.setSetPoint(this.address,value);
				callback(null);
			}).on('get', (callback) => {
				this.log.debug(sprintf("getCurrentSetpoint %s = %s",this.address, this.setpoint));
				callback(null, this.setpoint);
			});

		this.thermostatService.getCharacteristic(Characteristic.TemperatureDisplayUnits)
			.on('set', (value,callback) => {
				callback(null);
			}).on('get', (callback) => {
				this.log.debug(sprintf("getTemperatureDisplayUnits %s = %s",this.address, this.ambient));
				callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
			});

		return [service, this.thermostatService];
	}	
}

class MHThermometer {
	constructor(log, config) {
		this.config = config || {};
		this.mh = config.parent.controller;
		this.name = config.name;
		this.address = config.address;
		this.displayName = config.name;
		this.UUID = UUIDGen.generate(sprintf("thermometer-%s",config.address));
		this.log = log;
		
		this.ambient = -1;
		this.log.info(sprintf("LegrandMyHome::MHThermometer create object: %s", this.address));
	}

	getServices() {
		var service = new Service.AccessoryInformation();
		service.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Legrand MyHome")
			.setCharacteristic(Characteristic.Model, "Thermometer")
			.setCharacteristic(Characteristic.SerialNumber, "Address " + this.address);

		this.thermometerService = new Service.TemperatureSensor(this.name);
		this.thermometerService.getCharacteristic(Characteristic.CurrentTemperature).setProps({minValue: -50, minStep: 0.1, maxValue: 50})
			.on('get', (callback) => {
				this.log.debug(sprintf("getCurrentTemperature %s = %s",this.address, this.ambient));
				callback(null, this.ambient);
			});

		return [service, this.thermometerService];
	}	
}

class MHContactSensor {
	constructor(log, config) {
		this.config = config || {};
		this.mh = config.parent.controller;
		this.name = config.name;
		this.address = config.address;
		this.displayName = config.name;
		this.UUID = UUIDGen.generate(sprintf("contactsensor-%s",config.address));
		this.log = log;
		
		this.state = false;
		this.log.info(sprintf("LegrandMyHome::MHContactSensor create object: %s", this.address));
	}

	getServices() {
		var service = new Service.AccessoryInformation();
		service.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Legrand MyHome")
			.setCharacteristic(Characteristic.Model, "Contact Sensor")
			.setCharacteristic(Characteristic.SerialNumber, "Address " + this.address);

		this.contactSensorService = new Service.ContactSensor(this.name);
		this.contactSensorService.getCharacteristic(Characteristic.ContactSensorState)
			.on('get', (callback) => {
				this.log.debug(sprintf("getContactSensorState %s = %s",this.address, this.state));
				callback(null, this.state);
			});

		return [service, this.contactSensorService];
	}	
}