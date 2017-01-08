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
		this.controller = new mh.MyHomeClient(config.ipaddress, config.port, config.ownpassword, null);
		this.ready = false;
		this.devices = [];
		this.config.devices.forEach(function (accessory) {
			this.log.info("LegrandMyHome: adds accessory");
			accessory.parent = this;
			this.devices.push(new MHRelay(this.log,accessory))
		}.bind(this));
	}

	onMonitorFeedback(_frame) {

	}

	accessories(callback) {
		this.log.debug("LegrandMyHome (accessories readed)");
		callback(this.devices);
	}	
}

class MHRelay {
	constructor(log, config) {
		this.name = config.name;
		this.displayName = config.name;
		this.UUID = UUIDGen.generate(config.address);
		this.log = log;
		this.bri = 100;
		this.power = false;
		this.mh = config.parent.controller;
		this.sat = 0;
		this.hue = 0;
		this.address = config.address;
		this.log.info("LegrandMyHome::MHRelay create object");
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
				// this.parent.infusion.Load_Dim(this.address, this.power * this.bri);
				this.mh.lightCommand(this.address,this.power)
				callback(null);
			})
			.on('get', (callback) => {
				this.log.debug(sprintf("getPower %s = %s",this.address, this.power));
				callback(null, this.power);
			});

		// this.parent.infusion.getLoadStatus(this.address);
		return [service, this.lightBulbService];
	}
}