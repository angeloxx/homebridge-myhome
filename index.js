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
	// homebridge.registerAccessory('homebridge-myhome-relay', 'MHRelay', MHRelay);
};

class LegrandMyHome {
	constructor(log, config, api) {
		this.log = log;
		this.config = config || {};
		this.api = api;
		this.log.info("LegrandMyHome for MyHome Gateway at " + config.ipaddress + ":" + config.port);
		this.controller = new mh.MyHomeClient(config.ipaddress, config.port, config.ownpassword, this);
		this.ready = false;
		this.devices = [];
		this.config.devices.forEach(function (accessory) {
			this.log.info("LegrandMyHome: adds accessory");
			accessory.parent = this;

			if (accessory.accessory == 'MHRelay') this.devices.push(new MHRelay(this.log,accessory))
			if (accessory.accessory == 'MHDimmer') this.devices.push(new MHDimmer(this.log,accessory))
		}.bind(this));
	}

	onMonitor(_frame) {

	}

	onRelay(_address,_onoff) {
		this.devices.forEach(function(accessory) {
			if (accessory.address == _address && accessory.lightBulbService !== undefined) {
				this.log.info(_onoff);
				accessory.power = _onoff;
				accessory.bri = _onoff * 100;
				accessory.lightBulbService.getCharacteristic(Characteristic.On).getValue(null);
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
		this.mh = config.parent.controller;
		this.name = config.name;
		this.address = config.address;
		this.displayName = config.name;
		this.UUID = UUIDGen.generate(config.address);
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
		return [service, this.lightBulbService];
	}
}

class MHDimmer {
	constructor(log, config) {
		this.mh = config.parent.controller;
		this.name = config.name;
		this.address = config.address;
		this.displayName = config.name;
		this.UUID = UUIDGen.generate(config.address);
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