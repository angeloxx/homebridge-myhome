/*jshint esversion: 6,node: true,-W041: false */
var path = require("path");	
var mh = require(path.join(__dirname,'/lib/mhclient'));
var sprintf = require("sprintf-js").sprintf, inherits = require("util").inherits;
var events = require('events'), util = require('util'), fs = require('fs');
var Accessory, Characteristic, Service, UUIDGen;
var moment = require('moment');
var correctingInterval = require('correcting-interval');
const version = require('./package.json').version;

module.exports = function (homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	Accessory = homebridge.platformAccessory;
	UUIDGen = homebridge.hap.uuid;
	var FakeGatoHistoryService = require('fakegato-history')(homebridge);

	/* Try to map Elgato custom vars */
	LegrandMyHome.CurrentPowerConsumption = function() {
		Characteristic.call(this, 'Consumption', 'E863F10D-079E-48FF-8F27-9C2605A29F52');
		this.setProps({
			format: Characteristic.Formats.UINT16,
			unit: "Watts",
			maxValue: 100000,
			minValue: 0,
			minStep: 1,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
		};
		LegrandMyHome.CurrentPowerConsumption.UUID = 'E863F10D-079E-48FF-8F27-9C2605A29F52';
	inherits(LegrandMyHome.CurrentPowerConsumption, Characteristic);

	LegrandMyHome.TotalConsumption = function() {
		Characteristic.call(this, 'Energy', 'E863F10C-079E-48FF-8F27-9C2605A29F52');
		this.setProps({
			format: Characteristic.Formats.FLOAT,
			unit: "kWh",
			maxValue: 100000000000,
			minValue: 0,
			minStep: 0.001,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
		};
		LegrandMyHome.TotalConsumption.UUID = 'E863F10C-079E-48FF-8F27-9C2605A29F52';
	inherits(LegrandMyHome.TotalConsumption, Characteristic);

	LegrandMyHome.ResetTotal = function() {
		Characteristic.call(this, 'Reset', 'E863F112-079E-48FF-8F27-9C2605A29F52');
		this.setProps({
			format: Characteristic.Formats.UINT32,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY, Characteristic.Perms.WRITE]
		});
		this.value = this.getDefaultValue();
		};
		LegrandMyHome.ResetTotal.UUID = 'E863F112-079E-48FF-8F27-9C2605A29F52';
	inherits(LegrandMyHome.ResetTotal, Characteristic);

	LegrandMyHome.Sensitivity = function() {
		Characteristic.call(this, 'Sensitivity', 'E863F120-079E-48FF-8F27-9C2605A29F52');
		this.setProps({
			format: Characteristic.Formats.UINT16,
			maxValue: 7,
			minValue: 0,
			minStep: 1,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE]
		});
		this.value = this.getDefaultValue();
		};
		LegrandMyHome.Sensitivity.UUID = 'E863F120-079E-48FF-8F27-9C2605A29F52';
	inherits(LegrandMyHome.Sensitivity, Characteristic);

	LegrandMyHome.Duration = function() {
		Characteristic.call(this, 'Duration', 'E863F12D-079E-48FF-8F27-9C2605A29F52');
		this.setProps({
			format: Characteristic.Formats.UINT16,
			maxValue: 3600,
			minValue: 0,
			minStep: 1,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE]
		});
		this.value = this.getDefaultValue();
		};
		LegrandMyHome.Duration.UUID = 'E863F12D-079E-48FF-8F27-9C2605A29F52';
	inherits(LegrandMyHome.Duration, Characteristic);

	LegrandMyHome.LastActivation = function() {
		Characteristic.call(this, 'LastActivation', 'E863F11A-079E-48FF-8F27-9C2605A29F52');
		this.setProps({
			format: Characteristic.Formats.UINT32,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
		};
		LegrandMyHome.LastActivation.UUID = 'E863F11A-079E-48FF-8F27-9C2605A29F52';
	inherits(LegrandMyHome.LastActivation, Characteristic);

	LegrandMyHome.TimesOpened = function() {
		Characteristic.call(this, 'TimesOpened', 'E863F129-079E-48FF-8F27-9C2605A29F52');
		this.setProps({
			format: Characteristic.Formats.UINT32,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
		};
		LegrandMyHome.TimesOpened.UUID = 'E863F129-079E-48FF-8F27-9C2605A29F52';
	inherits(LegrandMyHome.TimesOpened, Characteristic);

	LegrandMyHome.Char118 = function() {
		Characteristic.call(this, 'Char118', 'E863F118-079E-48FF-8F27-9C2605A29F52');
		this.setProps({
			format: Characteristic.Formats.UINT32,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
		};
		LegrandMyHome.Char118.UUID = 'E863F118-079E-48FF-8F27-9C2605A29F52';
	inherits(LegrandMyHome.Char118, Characteristic);

	LegrandMyHome.Char119 = function() {
		Characteristic.call(this, 'Char119', 'E863F119-079E-48FF-8F27-9C2605A29F52');
		this.setProps({
			format: Characteristic.Formats.UINT32,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
		};
		LegrandMyHome.Char119.UUID = 'E863F119-079E-48FF-8F27-9C2605A29F52';
	inherits(LegrandMyHome.Char119, Characteristic);

	LegrandMyHome.PowerMeterService = function(displayName, subtype) {
			Service.call(this, displayName, '00000001-0000-1777-8000-775D67EC4377', subtype);
			this.addCharacteristic(LegrandMyHome.CurrentPowerConsumption);
			this.addCharacteristic(LegrandMyHome.TotalConsumption);
			this.addCharacteristic(LegrandMyHome.ResetTotal);
	};
	inherits(LegrandMyHome.PowerMeterService, Service);

	LegrandMyHome.FakeGatoHistoryService=FakeGatoHistoryService;
	inherits(LegrandMyHome.FakeGatoHistoryService, Service);

	LegrandMyHome.ControlledLoadService = function(displayName, subtype) {
			Service.call(this, displayName, 'D43133F2-9BDE-4731-9FF2-B427189DCB4A', subtype);
			this.addCharacteristic(Characteristic.OutletInUse);
			this.addCharacteristic(Characteristic.Active);
	};
	inherits(LegrandMyHome.ControlledLoadService, Service);

	LegrandMyHome.RainSensorService = function(displayName, subtype) {
			Service.call(this, displayName, '9018CDC8-DEF9-49D5-A969-63F8CCAAB1A6', subtype);
			this.addCharacteristic(Characteristic.CurrentRelativeHumidity);
	};
	inherits(LegrandMyHome.RainSensorService, Service);

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
		this.lightBuses = [];
		this.controller = new mh.MyHomeClient(config.ipaddress, config.port, config.ownpassword, config.setclock, this);
		this.config.devices.forEach(function (accessory) {
			this.log.info("LegrandMyHome: adds accessory");
			accessory.parent = this;
			if (accessory.accessory == 'MHRelay') this.devices.push(new MHRelay(this.log,accessory));
			if (accessory.accessory == 'MHBlind') this.devices.push(new MHBlind(this.log,accessory));
			if (accessory.accessory == 'MHBlindAdvanced') this.devices.push(new MHBlindAdvanced(this.log,accessory));
			if (accessory.accessory == 'MHOutlet') this.devices.push(new MHRelay(this.log,accessory));
			if (accessory.accessory == 'MHTimedRelay') this.devices.push(new MHTimedRelay(this.log,accessory));
			if (accessory.accessory == 'MHRain') this.devices.push(new MHRain(this.log,accessory));
			if (accessory.accessory == 'MHDimmer') this.devices.push(new MHDimmer(this.log,accessory));
			if (accessory.accessory == 'MHThermostat') this.devices.push(new MHThermostat(this.log,accessory));
			if (accessory.accessory == 'MHExternalThermometer') this.devices.push(new MHThermometer(this.log,accessory));	
			if (accessory.accessory == 'MHDryContact') this.devices.push(new MHDryContact(this.log,accessory));
			if (accessory.accessory == 'MHAux') this.devices.push(new MHAux(this.log,accessory));
			/* if (accessory.accessory == 'MHButton') this.devices.push(new MHButton(this.log,accessory)) */
			if (accessory.accessory == 'MHPowerMeter') this.devices.push(new MHPowerMeter(this.log,accessory));
			if (accessory.accessory == 'MHAlarm') this.devices.push(new MHAlarm(this.log,accessory));
			if (accessory.accessory == 'MHControlledLoad') this.devices.push(new MHControlledLoad(this.log,accessory));
			if (accessory.accessory == 'MHIrrigation') this.devices.push(new MHIrrigation(this.log,accessory));
			
		}.bind(this));
		this.log.info("LegrandMyHome for MyHome Gateway at " + config.ipaddress + ":" + config.port);
		this.controller.start();
	}

	onMonitor(_frame) {

	}

	onConnect() {
		this.devices.forEach(function (accessory) {
			if (accessory.thermostatService !== undefined) this.controller.getThermostatStatus(accessory.address);
			if (accessory.contactSensorService !== undefined || accessory.dryContactService !== undefined) this.controller.getContactState(accessory.address);
			if (accessory.windowCoveringPlusService !== undefined) this.controller.getAdvancedBlindState(accessory.address);
			if (accessory.lightBulbService !== undefined && accessory.pul == true)
				this.controller.getRelayState(accessory.address);
			if (accessory.rainService !== undefined && accessory.pul == true)
				this.controller.getRelayState(accessory.address);
			if (accessory.IrrigationService !== undefined && accessory.pul == true)
				this.controller.getRelayState(accessory.address);
			if (accessory.alarmService !== undefined)
				this.controller.getAlarmState();
		}.bind(this));
	}

	onRelay(_address,_onoff) {

		var address = _address.split("/"); 
        if (address.length != 3) return "";
        var a = parseInt(address[1]), pl = parseInt(address[2]);

		if (pl!=0)
			this.devices.forEach(function(accessory) {
				if (accessory.address == _address && accessory.lightBulbService !== undefined) {
					accessory.power = _onoff;
					accessory.bri = _onoff * 100;
					accessory.lightBulbService.getCharacteristic(Characteristic.On).getValue(null);
				}
				if (accessory.address == _address && accessory.rainService !== undefined) {
					accessory.power = _onoff;
					accessory.rainService.getCharacteristic(Characteristic.CurrentRelativeHumidity).getValue(null);
				}
				if (accessory.address == _address && accessory.OutletService !== undefined) {
					accessory.power = _onoff;
					accessory.OutletService.getCharacteristic(Characteristic.On).getValue(null);
				}
				if (accessory.address == _address && accessory.IrrigationService !== undefined) {
					accessory.power = _onoff;
					//accessory.askDuration = true;
					accessory.IrrigationService.getCharacteristic(Characteristic.Active).getValue(null);
					accessory.IrrigationService.getCharacteristic(Characteristic.InUse).getValue(null);
				}
			}.bind(this));
		else
			if (a==0)
				this.devices.forEach(function(accessory) {
					if (accessory.lightBulbService !== undefined && accessory.pul == false) {
						accessory.power = _onoff;
						accessory.bri = _onoff * 100;
						accessory.lightBulbService.getCharacteristic(Characteristic.On).getValue(null);
					}
					if (accessory.address == _address && accessory.rainService !== undefined) {
						accessory.power = _onoff;
						accessory.rainService.getCharacteristic(Characteristic.CurrentRelativeHumidity).getValue(null);
					}
					if (accessory.address == _address && accessory.OutletService !== undefined) {
						accessory.power = _onoff;
						accessory.OutletService.getCharacteristic(Characteristic.On).getValue(null);
					}
				}.bind(this));
			else
				this.devices.forEach(function(accessory) {
					if (accessory.ambient == a && accessory.lightBulbService !== undefined && accessory.pul == false) {
						accessory.power = _onoff;
						accessory.bri = _onoff * 100;
						accessory.lightBulbService.getCharacteristic(Characteristic.On).getValue(null);
					}
					if (accessory.address == _address && accessory.rainService !== undefined) {
						accessory.power = _onoff;
						accessory.rainService.getCharacteristic(Characteristic.CurrentRelativeHumidity).getValue(null);
					}
					if (accessory.address == _address && accessory.OutletService !== undefined) {
						accessory.power = _onoff;
						accessory.OutletService.getCharacteristic(Characteristic.On).getValue(null);
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
	onRelayDuration(_address,_value) {
		this.devices.forEach(function(accessory) {
			if (accessory.address == _address && accessory.IrrigationService !== undefined) {
				if (accessory.power)
				{
					accessory.RemDuration = _value;
					accessory.timerHandle = setInterval(function() {
					accessory.IrrigationService.setCharacteristic(Characteristic.RemainingDuration,accessory.RemDuration);
						accessory.RemDuration--;
						if (accessory.RemDuration == 0)
							clearInterval(accessory.timerHandle);
					}.bind(this),1000);
				}

					
			}
		}.bind(this));
	}
	
	
	onDryContact(_address,_state) {
		this.devices.forEach(function(accessory) {
			if (accessory.address == _address && accessory.dryContactService !== undefined) {
				
			    switch (accessory.type) {
				case 'Contact':
					accessory.state = _state;
					accessory.dryContactService.getCharacteristic(Characteristic.ContactSensorState).getValue(null);
					break;
				case 'Leak':
					accessory.state = _state;	accessory.dryContactService.getCharacteristic(Characteristic.LeakDetected).getValue(null);
					break;
				case 'Motion':	
					if (_state==true)
					{
						accessory.state = true;
						accessory.dryContactService.getCharacteristic(Characteristic.MotionDetected).getValue(null);
						clearTimeout(accessory.durationhandle);
						accessory.durationhandle = setTimeout(function() { 
            				accessory.state = false;
							accessory.dryContactService.getCharacteristic(Characteristic.MotionDetected).getValue(null); 
       					}.bind(this), accessory.duration * 1000);
					}
					else
						if (accessory.firstGet == true)
						{
							accessory.state = _state;
							accessory.dryContactService.getCharacteristic(Characteristic.MotionDetected).getValue(null);
						}
					break;
				default:	
					accessory.state = _state;
					accessory.dryContactService.getCharacteristic(Characteristic.ContactSensorState).getValue(null);
					break;
				}	
			}
		}.bind(this));
	}
	
	onAUX(_address,_state) {
		this.devices.forEach(function(accessory) {
			if (accessory.address == _address && accessory.AUXService !== undefined) {
				accessory.state = _state;
			    switch (accessory.type) {
				case 'Contact':	accessory.AUXService.getCharacteristic(Characteristic.ContactSensorState).getValue(null);
					break;
				case 'Leak':	accessory.AUXService.getCharacteristic(Characteristic.LeakDetected).getValue(null);
					break;
				case 'Motion':	accessory.AUXService.getCharacteristic(Characteristic.MotionDetected).getValue(null);
					break;
				case 'Gas':	accessory.AUXService.getCharacteristic(Characteristic.CarbonMonoxideDetected).getValue(null);
					break;
				default:	accessory.AUXService.getCharacteristic(Characteristic.ContactSensorState).getValue(null);
					break;
				}	
			}
		}.bind(this));
	}

	onDimmer(_address,_level) {
		var address = _address.split("/"); 
        if (address.length != 3) return "";
        var a = parseInt(address[1]), pl = parseInt(address[2]);
		
		if (pl!=0)
			this.devices.forEach(function(accessory) {
				if (accessory.address == _address && accessory.lightBulbService !== undefined) {
					accessory.power = (_level > 0) ? 1 : 0;
					accessory.bri = _level;
					accessory.lightBulbService.getCharacteristic(Characteristic.On).getValue(null);
					accessory.lightBulbService.getCharacteristic(Characteristic.Brightness).getValue(null);
				}
			}.bind(this));
		else
			if (a==0)
				this.devices.forEach(function(accessory) {
					if (accessory.lightBulbService !== undefined && accessory.pul == false) {
						accessory.power = (_level > 0) ? 1 : 0;
						accessory.bri = _level;
						accessory.lightBulbService.getCharacteristic(Characteristic.On).getValue(null);
						accessory.lightBulbService.getCharacteristic(Characteristic.Brightness).getValue(null);
					}
				}.bind(this));
			else
				this.devices.forEach(function(accessory) {
					if (accessory.ambient == a && accessory.lightBulbService !== undefined && accessory.pul == false) {
						accessory.power = (_level > 0) ? 1 : 0;
						accessory.bri = _level;
						accessory.lightBulbService.getCharacteristic(Characteristic.On).getValue(null);
						accessory.lightBulbService.getCharacteristic(Characteristic.Brightness).getValue(null);
					}
				}.bind(this));
	}

	onPowerMeter(_value) {
		this.devices.forEach(function(accessory) {
			if (accessory.powerMeterService !== undefined) {
				accessory.value  = _value;
			}
		}.bind(this));
	}

	onAlarm(_state) {
		this.devices.forEach(function(accessory) {
			if (accessory.alarmService !== undefined) {
				if (_state==3)
				{
					accessory.active = false;
					accessory.triggered = false;
				}
				else
					if (_state==1)
						accessory.active = true;
				if (_state == 4)
					accessory.triggered = true;
				if ((accessory.active==true && _state!=1))
				{
					accessory.state  = _state;
					accessory.alarmService.getCharacteristic(Characteristic.SecuritySystemCurrentState).getValue(null);
				}
				if ((accessory.active==false && _state!=4))
				{
					accessory.state  = _state;
					accessory.alarmService.getCharacteristic(Characteristic.SecuritySystemCurrentState).getValue(null);
				}
				
				if (_state != 4)
				{	
					accessory.target = _state;
					accessory.alarmService.getCharacteristic(Characteristic.SecuritySystemTargetState).getValue(null);
				}
			}
		}.bind(this));
	}

	onAlarmFault(_state){
		this.devices.forEach(function(accessory) {
			if (accessory.alarmService !== undefined) {
				accessory.fault  = _state;
				accessory.alarmService.getCharacteristic(Characteristic.StatusFault).getValue(null);
			}
		}.bind(this));

	}

	onAlarmTampered(_state){
		this.devices.forEach(function(accessory) {
			if (accessory.alarmService !== undefined) {
				accessory.tampered  = _state;
				accessory.alarmService.getCharacteristic(Characteristic.StatusTampered).getValue(null);
			}
		}.bind(this));

	}

	onZoneActive(_zone, _state) {
		this.devices.forEach(function(accessory) {
			if (accessory.alarmService !== undefined) {
				accessory.zone[_zone]  = _state;
				if (accessory.zone[0] == true &&  
						accessory.zone[1] == true &&
						accessory.zone[2] == true &&
						accessory.zone[3] == true &&
						accessory.zone[4] == false &&
						accessory.zone[5] == false &&
						accessory.zone[6] == false &&
						accessory.zone[7] == false && 
						accessory.active == true &&
						accessory.triggered == false)
				{
					accessory.state = Characteristic.SecuritySystemCurrentState.AWAY_ARM;
					accessory.target = Characteristic.SecuritySystemTargetState.AWAY_ARM;
					accessory.alarmService.getCharacteristic(Characteristic.SecuritySystemCurrentState).getValue(null);
					accessory.alarmService.getCharacteristic(Characteristic.SecuritySystemTargetState).getValue(null);
				} 

				else
					if (accessory.zone[0] == true &&  
							accessory.zone[1] == false &&
							accessory.zone[2] == true &&
							accessory.zone[3] == false &&
							accessory.zone[4] == false &&
							accessory.zone[5] == false &&
							accessory.zone[6] == false &&
							accessory.zone[7] == false && 
							accessory.active == true &&
							accessory.triggered == false)
					{
						accessory.state = Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
						accessory.target = Characteristic.SecuritySystemTargetState.NIGHT_ARM;
						accessory.alarmService.getCharacteristic(Characteristic.SecuritySystemCurrentState).getValue(null);
						accessory.alarmService.getCharacteristic(Characteristic.SecuritySystemTargetState).getValue(null);
					} 
					else
						if (accessory.active == true && accessory.triggered == false)
						{
							accessory.state = Characteristic.SecuritySystemCurrentState.STAY_ARM;
							accessory.target = Characteristic.SecuritySystemTargetState.STAY_ARM;
							accessory.alarmService.getCharacteristic(Characteristic.SecuritySystemCurrentState).getValue(null);
							accessory.alarmService.getCharacteristic(Characteristic.SecuritySystemTargetState).getValue(null);
						} 		
			}
		}.bind(this));
	}

	onAlarmLowBattery(_state){
		this.devices.forEach(function(accessory) {
			if (accessory.alarmBatteryService !== undefined) {
				accessory.lowbattery  = _state;
				accessory.batterycharging = !_state;
				if (_state==0)
					accessory.batterylevel = 100;
				else
					accessory.batterylevel = 0;
				accessory.alarmBatteryService.getCharacteristic(Characteristic.StatusLowBattery).getValue(null);
				accessory.alarmBatteryService.getCharacteristic(Characteristic.BatteryLevel).getValue(null);
				accessory.alarmBatteryService.getCharacteristic(Characteristic.ChargingState).getValue(null);
			}
		}.bind(this));

	}

	onControlledLoad(_address,_value){
		this.devices.forEach(function(accessory) {
			if (accessory.controlledLoad !== undefined)
			{
				if (accessory.address == _address)
				{
					switch (_value){
						case 0:
							accessory.enabled=false;
							accessory.controlledLoad.getCharacteristic(Characteristic.OutletInUse).getValue(null);
							break;
						case 1:
							accessory.enabled=true;
							accessory.controlledLoad.getCharacteristic(Characteristic.OutletInUse).getValue(null);
							break;
						case 2:
							accessory.forced=1;
							accessory.controlledLoad.getCharacteristic(Characteristic.Active).getValue(null);
							break;
						case 3:
							accessory.forced=0;
							accessory.controlledLoad.getCharacteristic(Characteristic.Active).getValue(null);
							break;
					}
				}
			}
		}.bind(this));
	}
	
	onSimpleBlind(_address,_value) {
		var address = _address.split("/"); 
        if (address.length != 3) return "";
        var a = parseInt(address[1]), pl = parseInt(address[2]);
		
		if (pl!=0)
			this.devices.forEach(function(accessory) {
				if (accessory.address == _address && accessory.windowCoveringService !== undefined) {
					switch (_value) {
						case 0:
							accessory.state = Characteristic.PositionState.STOPPED;
							accessory.evaluatePosition();
							break;
						case 1:
							if (accessory.invert == false)
								accessory.state = Characteristic.PositionState.INCREASING;
							else
								accessory.state = Characteristic.PositionState.DECREASING;
							accessory.evaluatePosition();
							break;
						case 2:
							
							if (accessory.invert == false)
								accessory.state = Characteristic.PositionState.DECREASING;
							else
								accessory.state = Characteristic.PositionState.INCREASING;
							accessory.evaluatePosition();
							break;
					}
					accessory.windowCoveringService.getCharacteristic(Characteristic.PositionState).getValue(null);
					accessory.windowCoveringService.getCharacteristic(Characteristic.CurrentPosition).getValue(null);
					accessory.windowCoveringService.getCharacteristic(Characteristic.TargetPosition).getValue(null);
				}
			}.bind(this));
		else
			if (a==0)
				this.devices.forEach(function(accessory) {
					if (accessory.windowCoveringService !== undefined && accessory.pul == false) {
						switch (_value) {
							case 0:
								accessory.state = Characteristic.PositionState.STOPPED;
								accessory.evaluatePosition();
								break;
							case 1:
								if (accessory.invert == false)
									accessory.state = Characteristic.PositionState.INCREASING;
								else
									accessory.state = Characteristic.PositionState.DECREASING;
								accessory.evaluatePosition();
								break;
							case 2:	
								if (accessory.invert == false)
									accessory.state = Characteristic.PositionState.DECREASING;
								else
									accessory.state = Characteristic.PositionState.INCREASING;
								accessory.evaluatePosition();
								break;
						}
						accessory.windowCoveringService.getCharacteristic(Characteristic.PositionState).getValue(null);
						accessory.windowCoveringService.getCharacteristic(Characteristic.CurrentPosition).getValue(null);
						accessory.windowCoveringService.getCharacteristic(Characteristic.TargetPosition).getValue(null);
					}
				}.bind(this));
			else
				this.devices.forEach(function(accessory) {
					if (accessory.ambient == a && accessory.windowCoveringService !== undefined && accessory.pul == false) {
						switch (_value) {
							case 0:
								accessory.state = Characteristic.PositionState.STOPPED;
								accessory.evaluatePosition();
								break;
							case 1:
								if (accessory.invert == false)
									accessory.state = Characteristic.PositionState.INCREASING;
								else
									accessory.state = Characteristic.PositionState.DECREASING;
								accessory.evaluatePosition();
								break;
							case 2:
								if (accessory.invert == false)
									accessory.state = Characteristic.PositionState.DECREASING;
								else
									accessory.state = Characteristic.PositionState.INCREASING;
								accessory.evaluatePosition();
								break;
						}
						accessory.windowCoveringService.getCharacteristic(Characteristic.PositionState).getValue(null);
						accessory.windowCoveringService.getCharacteristic(Characteristic.CurrentPosition).getValue(null);
						accessory.windowCoveringService.getCharacteristic(Characteristic.TargetPosition).getValue(null);
					}
				}.bind(this));
	}

	onAdvancedBlind(_address,_action,_position) {
		this.devices.forEach(function(accessory) { 
			if (accessory.address == _address && accessory.windowCoveringPlusService !== undefined) {
				if (_action == "STOP") {
					accessory.currentPosition = accessory.targetPosition = _position;
					accessory.windowCoveringPlusService.getCharacteristic(Characteristic.CurrentPosition).getValue(null);
					accessory.windowCoveringPlusService.getCharacteristic(Characteristic.TargetPosition).getValue(null);
					accessory.state = Characteristic.PositionState.STOPPED;
					accessory.windowCoveringPlusService.getCharacteristic(Characteristic.PositionState).getValue(null);
				} else if (_action == "UP") {
					accessory.currentPosition = _position;
					accessory.windowCoveringPlusService.getCharacteristic(Characteristic.TargetPosition).getValue(null);

					accessory.state = Characteristic.PositionState.INCREASING;
					accessory.windowCoveringPlusService.getCharacteristic(Characteristic.PositionState).getValue(null);
				} else if (_action == "DOWN") {
					accessory.currentPosition = _position;
					accessory.windowCoveringPlusService.getCharacteristic(Characteristic.TargetPosition).getValue(null);

					accessory.state = Characteristic.PositionState.DECREASING;
					accessory.windowCoveringPlusService.getCharacteristic(Characteristic.PositionState).getValue(null);
				}
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
					accessory.thermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState).getValue(null);
				}
				if (_measure == "HEATING") {
					if (_level == true) {
						accessory.state = Characteristic.CurrentHeatingCoolingState.HEAT;
					} else {
						if (accessory.state != Characteristic.CurrentHeatingCoolingState.COOL)
							accessory.state = Characteristic.CurrentHeatingCoolingState.OFF;
					}
					accessory.thermostatService.getCharacteristic(Characteristic.CurrentHeatingCoolingState).getValue(null);
					accessory.thermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState).getValue(null);
				}
				if (_measure == "COOLING") {
					if (_level == true) {
						accessory.state = Characteristic.CurrentHeatingCoolingState.COOL;
					} else {
						if (accessory.state != Characteristic.CurrentHeatingCoolingState.HEAT)
							accessory.state = Characteristic.CurrentHeatingCoolingState.OFF;
					}
					accessory.thermostatService.getCharacteristic(Characteristic.CurrentHeatingCoolingState).getValue(null);
					accessory.thermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState).getValue(null);
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
		this.groups = config.groups || []; 		/* TODO */
		this.pul = config.pul || false; 						
		this.displayName = config.name;
		this.UUID = UUIDGen.generate(sprintf("relay-%s",config.address));
		this.log = log;
		this.power = false;
		this.bri = 100;
		this.sat = 0;
		this.hue = 0;
		this.log.info(sprintf("LegrandMyHome::MHRelay create object: %s", this.address));
		this.mh.addLightBusDevice(this.address);

		var address = this.address.split("/"); 
        this.bus = parseInt(address[0]);
		this.ambient = parseInt(address[1]);
		this.pl = parseInt(address[2]);
	}

	getServices() {
		var service = new Service.AccessoryInformation();
		service.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Simone Tisa")
			.setCharacteristic(Characteristic.Model, "Relay")
			.setCharacteristic(Characteristic.FirmwareRevision, version)
			.setCharacteristic(Characteristic.SerialNumber, "Address " + this.address);

		switch (this.config.accessory) {
			case 'MHOutlet':
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

				/* Custom frame support */
				if (this.power && this.config.frame_on != null) {
					this.mh.send(this.config.frame_on);
				} else if (!this.power && this.config.frame_off != null) {
					this.mh.send(this.config.frame_off);
				} else {
					this.mh.relayCommand(this.address,this.power);
				}
				callback(null);
			})
			.on('get', (callback) => {
				this.log.debug(sprintf("getPower %s = %s",this.address, this.power));
				callback(null, this.power);
			});
		
		return [service, this.lightBulbService];
	}
}

class MHTimedRelay {
	constructor(log, config) {
		this.config = config || {};
		this.mh = config.parent.controller;
		this.name = config.name;
		this.address = config.address;
		this.groups = config.groups || []; 		/* TODO */
		this.pul = config.pul || false; 						
		this.displayName = config.name;
		this.UUID = UUIDGen.generate(sprintf("timedrelay-%s",config.address));
		this.log = log;
		this.power = false;
		this.timer = config.timer || 1;
		this.log.info(sprintf("LegrandMyHome::MHTimedRelay create object: %s", this.address));
		this.mh.addLightBusDevice(this.address);

		var address = this.address.split("/"); 
        this.bus = parseInt(address[0]);
		this.ambient = parseInt(address[1]);
		this.pl = parseInt(address[2]);
	}

	getServices() {
		var service = new Service.AccessoryInformation();
		service.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Simone Tisa")
			.setCharacteristic(Characteristic.Model, "TimedRelay")
			.setCharacteristic(Characteristic.FirmwareRevision, version)
			.setCharacteristic(Characteristic.SerialNumber, "Address " + this.address);

		
		this.OutletService = new Service.Outlet(this.name);
		this.OutletService.addCharacteristic(Characteristic.LockManagementAutoSecurityTimeout);
		this.OutletService.getCharacteristic(Characteristic.LockManagementAutoSecurityTimeout)
		.setProps({
			format: Characteristic.Formats.UINT32,
			unit: Characteristic.Units.SECONDS,
			maxValue: 3540,
			minValue: 0,
			minStep: 60,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
		});
		this.OutletService.getCharacteristic(Characteristic.On)
			.on('set', (_value, callback) => {
				//this.log.debug(sprintf("setPower %s = %s",this.address, level));
				this.power = _value;
	
				/* Custom frame support */
				if (this.power && this.timer !=0)
				{
					this.mh.relayTimedOn(this.address,this.timer/3600,this.timer/60,this.timer%60);
				}
				else
				{
					this.mh.relayCommand(this.address,this.power);
				}
				callback(null);
			})
			.on('get', (callback) => {
				this.log.debug(sprintf("getPower %s = %s",this.address, this.power));
				callback(null, this.power);
			});
		this.OutletService.getCharacteristic(Characteristic.LockManagementAutoSecurityTimeout)
			.on('set', (time, callback) => {
				this.timer = time;
				callback(null);
			})
			.on('get', (callback) => {
				this.log.debug(sprintf("getPower %s = %s",this.address, this.power));
				callback(null, this.timer);
			});
		
		
		return [service, this.OutletService];
	}
}

class MHRain {
	constructor(log, config) {
		this.config = config || {};
		this.mh = config.parent.controller;
		this.name = config.name;
		this.address = config.address;
		this.groups = config.groups || []; 		/* TODO */
		this.pul = config.pul || false; 						
		this.displayName = config.name;
		this.UUID = UUIDGen.generate(sprintf("relay-%s",config.address));
		this.log = log;
		this.power = 0;
		this.log.info(sprintf("LegrandMyHome::MHRain create object: %s", this.address));
		this.mh.addLightBusDevice(this.address);

		var address = this.address.split("/"); 
        this.bus = parseInt(address[0]);
		this.ambient = parseInt(address[1]);
		this.pl = parseInt(address[2]);
	}

	getServices() {
		var service = new Service.AccessoryInformation();
		service.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Simone Tisa")
			.setCharacteristic(Characteristic.Model, "Relay")
			.setCharacteristic(Characteristic.FirmwareRevision, version)
			.setCharacteristic(Characteristic.SerialNumber, "Address " + this.address);

	
		this.rainService = new LegrandMyHome.RainSensorService(this.name);
		this.rainService.getCharacteristic(Characteristic.CurrentRelativeHumidity)
			.on('get', (callback) => {
				//this.log.debug(sprintf("getPower %s = %s",this.address, this.power));
				callback(null, 100 - this.power * 100);
			});
		
		return [service, this.rainService];
	}
}

class MHBlind {
	constructor(log, config) {
		this.config = config || {};
		this.mh = config.parent.controller;
		this.name = config.name;
		this.address = config.address;
		this.groups = config.groups || []; 		/* TODO */
		this.pul = config.pul || false; 						
		this.displayName = config.name;
		this.time = config.time || 0;
		this.UUID = UUIDGen.generate(sprintf("blind-%s",config.address));
		this.log = log;
		this.invert = config.invert || false;
		
		this.runningStartTime = -1;
		this.runningDirection = Characteristic.PositionState.STOPPED;
		this.state = Characteristic.PositionState.STOPPED;
		this.currentPosition = 0;
		this.targetPosition = 0;
		this.startDelayMs = config.startDelayMs || 0; /* Start delay of the automation and MH relay */
		this.timeAdjust = config.timeAdjust || 5; /* Percent error, F411 is a bit buggy */
		this.log.info(sprintf("LegrandMyHome::MHBlind create object: %s", this.address));

		var address = this.address.split("/"); 
        this.bus = parseInt(address[0]);
		this.ambient = parseInt(address[1]);
		this.pl = parseInt(address[2]);
	}

	evaluatePosition() {
		if (this.runningDirection == Characteristic.PositionState.STOPPED && this.state != Characteristic.PositionState.STOPPED) {
			this.runningStartTime = new Date();
			this.runningDirection = this.state;
			this.log.debug(sprintf("Starting position is %d", this.currentPosition));
		} else {
			if (this.runningDirection != Characteristic.PositionState.STOPPED && this.state == Characteristic.PositionState.STOPPED) {
				if (this.runningDirection == 	Characteristic.PositionState.INCREASING) {
					this.currentPosition = Math.min(100,this.currentPosition + (100 / (this.time*1000) * (((new Date())-this.runningStartTime+this.startDelayMs)*(1+this.timeAdjust/100))));
				} else {
					this.currentPosition = Math.max(0,this.currentPosition - (100 / (this.time*1000) * (((new Date())-this.runningStartTime+this.startDelayMs)*(1+this.timeAdjust/100))));
				}
				this.runningDirection = this.state;
				this.targetPosition = this.currentPosition;
				this.runningStartTime = -1;

				this.log.debug(sprintf("Ending position is %d", this.currentPosition));
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
			.setCharacteristic(Characteristic.Manufacturer, "Simone Tisa")
			.setCharacteristic(Characteristic.Model, "Blind")
			.setCharacteristic(Characteristic.FirmwareRevision, version)
			.setCharacteristic(Characteristic.SerialNumber, "Address " + this.address);

		this.windowCoveringService = new Service.WindowCovering(this.name);

		this.windowCoveringService.getCharacteristic(Characteristic.PositionState)
			.on('get', (callback) => {
				this.log.debug(sprintf("getPositionState %s = %s",this.address, this.state));
				callback(null, this.state);
			});

		this.windowCoveringService.getCharacteristic(Characteristic.CurrentPosition)
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

class MHBlindAdvanced {
	constructor(log, config) {
		this.config = config || {};
		this.mh = config.parent.controller;
		this.name = config.name;
		this.address = config.address;
		this.groups = config.groups || []; 		/* TODO */
		this.pul = false; 						/* TODO */
		this.displayName = config.name;
		//this.time = config.time || 0;
		this.UUID = UUIDGen.generate(sprintf("blindplus-%s",config.address));
		this.log = log;
		
		this.state = Characteristic.PositionState.STOPPED;
		this.currentPosition = 0;
		this.targetPosition = 0;
		this.log.info(sprintf("LegrandMyHome::MHBlindAdvanced create object: %s", this.address));
	}

	getServices() {
		var service = new Service.AccessoryInformation();
		service.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Simone Tisa")
			.setCharacteristic(Characteristic.Model, "Advanced Blind")
			.setCharacteristic(Characteristic.FirmwareRevision, version)
			.setCharacteristic(Characteristic.SerialNumber, "Address " + this.address);

		this.windowCoveringPlusService = new Service.WindowCovering(this.name);

		this.windowCoveringPlusService.getCharacteristic(Characteristic.PositionState)
			.on('get', (callback) => {
				this.log.debug(sprintf("getPositionState %s = %s",this.address, this.state));
				callback(null, this.state);
			});

		this.windowCoveringPlusService.getCharacteristic(Characteristic.CurrentPosition)
			.on('get', (callback) => {
				this.log.debug(sprintf("getCurrentPosition %s = %s",this.address, this.state));
				callback(null, this.currentPosition);
			});

		this.windowCoveringPlusService.getCharacteristic(Characteristic.TargetPosition)
			.on('set', (value, callback) => {
				this.targetPosition = value;
				if (this.targetPosition == this.currentPosition) {
					this.state = Characteristic.PositionState.STOPPED;
				} else if (this.targetPosition > this.currentPosition) {
					this.state = Characteristic.PositionState.INCREASING;
				} else {
					this.state = Characteristic.PositionState.DECREASING;
				}
				this.mh.advancedBlindCommand(this.address,this.targetPosition);
				this.windowCoveringPlusService.getCharacteristic(Characteristic.PositionState).getValue(null);
				callback(null);
			})
			.on('get', (callback) => {
				this.log.debug(sprintf("getTargetPosition %s = %s",this.address, this.targetPosition));
				callback(null, this.targetPosition);
			});

		return [service, this.windowCoveringPlusService];
	}
}

class MHDimmer {
	constructor(log, config) {
		this.config = config || {};
		this.mh = config.parent.controller;
		this.name = config.name;
		this.address = config.address;
		this.groups = config.groups || []; 		/* TODO */
		this.pul = config.pul || false; 						
		this.displayName = config.name;
		this.UUID = UUIDGen.generate(sprintf("dimmer-%s",config.address));
		this.log = log;
		
		this.power = false;
		this.bri = 100;
		this.sat = 0;
		this.hue = 0;
		this.log.info(sprintf("LegrandMyHome::MHRelay create object: %s", this.address));

		var address = this.address.split("/"); 
        this.bus = parseInt(address[0]);
		this.ambient = parseInt(address[1]);
		this.pl = parseInt(address[2]);
	}

	getServices() {
		var service = new Service.AccessoryInformation();
		service.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Simone Tisa")
			.setCharacteristic(Characteristic.Model, "Dimmer")
			.setCharacteristic(Characteristic.FirmwareRevision, version)
			.setCharacteristic(Characteristic.SerialNumber, "Address " + this.address);

		this.lightBulbService = new Service.Lightbulb(this.name);

		this.lightBulbService.getCharacteristic(Characteristic.On)
			.on('set', (level, callback) => {
				this.log.debug(sprintf("setPower %s = %s",this.address, level));
				this.power = (level > 0);
				if (this.power && this.bri == 0) {
					this.bri = 100;
				}
				this.mh.relayCommand(this.address,this.power);
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
				this.mh.dimmerCommand(this.address,this.bri);
				callback(null);
			})
			.on('get', (callback) => {
				this.log.debug(sprintf("getBrightness %s = %d",this.address, this.bri));
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
		this.state = Characteristic.TargetHeatingCoolingState.OFF;
		this.log.info(sprintf("LegrandMyHome::MHThermostat create object: %s", this.address));
	}

	getServices() {
		var service = new Service.AccessoryInformation();
		service.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Simone Tisa")
			.setCharacteristic(Characteristic.Model, "Thermostat")
			.setCharacteristic(Characteristic.FirmwareRevision, version)
			.setCharacteristic(Characteristic.SerialNumber, "Address " + this.address);

		this.thermostatService = new Service.Thermostat(this.name);
		this.thermostatService.getCharacteristic(Characteristic.CurrentTemperature).setProps({minValue: -50, minStep: 0.1, maxValue: 50})
			.on('get', (callback) => {
				this.log.debug(sprintf("getCurrentTemperature %s = %s",this.address, this.ambient));
				callback(null, this.ambient);
			});

		this.thermostatService.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
			.on('get', (callback) => {
				this.log.debug(sprintf("getCurrentHeatingCoolingState %s = %s",this.address, this.state));
				callback(null, this.state);
			}).on('set', (value,callback) => {
				callback(null);
			});	

		this.thermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState)
			.on('get', (callback) => {
				this.log.debug(sprintf("getTargetHeatingCoolingState %s = %s",this.address, this.state));
				if (parseInt(this.setpoint,10) > parseInt(this.ambient,10)) {
					callback(null, Characteristic.TargetHeatingCoolingState.HEAT);
				} else if (parseInt(this.setpoint,10) < parseInt(this.ambient,10)) {
					callback(null, Characteristic.TargetHeatingCoolingState.COOL);
				} else {
					callback(null, Characteristic.TargetHeatingCoolingState.OFF);
				}
			}).on('set', (value,callback) => {
				this.state = value;
				this.log.debug(sprintf("setTargetHeatingCoolingState %s = %s",this.address, this.state));
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
			.setCharacteristic(Characteristic.Manufacturer, "Simone Tisa")
			.setCharacteristic(Characteristic.Model, "Thermometer")
			.setCharacteristic(Characteristic.FirmwareRevision, version)
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

class MHPowerMeter {
	constructor(log, config) {
		this.config = config || {};
		this.mh = config.parent.controller;
		this.name = config.name;
		this.displayName = config.name;
		this.UUID = UUIDGen.generate(sprintf("powermeter-%s",config.address));
		this.log = log;
		this.refresh = config.refresh || 15;
		this.intPower = 0;
		this.acquiredSamples = 0;
		this.lastReset = 0;	
		this.value = 0;
		this.totalenergy = 0;
		this.ExtraPersistedData = {};
		this.log.info(sprintf("LegrandMyHome::MHPowerMeter create object"));
		correctingInterval.setCorrectingInterval(function(){
			this.totalenergy = this.totalenergy + this.value * this.refresh / 3600 / 1000;
			this.powerLoggingService.setExtraPersistedData({totalenergy:this.totalenergy, lastReset:this.lastReset});
			this.powerMeterService.getCharacteristic(LegrandMyHome.CurrentPowerConsumption).getValue(null);
			this.powerMeterService.getCharacteristic(LegrandMyHome.TotalConsumption).getValue(null);
			this.powerLoggingService.addEntry({time: moment().unix(), power:this.value}); 
			this.mh.getPower();
		}.bind(this), this.refresh * 1000);
	}

	identify(callback) {
        this.log("Identify requested!");
        callback(); // success
    }

	getServices() {
		var service = new Service.AccessoryInformation();
		
		service.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Simone Tisa")
			.setCharacteristic(Characteristic.Model, "Power Meter")
			.setCharacteristic(Characteristic.FirmwareRevision, version)
			.setCharacteristic(Characteristic.SerialNumber, "Name-" + this.name);

		this.powerMeterService = new LegrandMyHome.PowerMeterService(this.name);
		this.powerMeterService.getCharacteristic(LegrandMyHome.CurrentPowerConsumption)
			.on('get', (callback) => {
				this.log.debug(sprintf("getConsumptio = %s",this.value));
				callback(null, this.value);
			});
		this.powerMeterService.getCharacteristic(LegrandMyHome.TotalConsumption)
			.on('get', (callback) => {
				this.ExtraPersistedData = this.powerLoggingService.getExtraPersistedData();
				if (this.ExtraPersistedData != undefined ) 
					this.totalenergy = this.ExtraPersistedData.totalenergy;
				this.log.debug(sprintf("getConsumptio = %f",this.totalenergy));
				callback(null, this.totalenergy);
			});
		this.powerMeterService.getCharacteristic(LegrandMyHome.ResetTotal)
			.on('set', (value, callback) => {
				this.totalenergy = 0;
				this.lastReset = value;
				this.powerLoggingService.setExtraPersistedData({totalenergy:this.totalenergy, lastReset:this.lastReset});
				callback(null);
			})
			.on('get', (callback) => {
				this.ExtraPersistedData = this.powerLoggingService.getExtraPersistedData();
				if (this.ExtraPersistedData != undefined ) 
					this.lastReset = this.ExtraPersistedData.lastReset;
				callback(null, this.lastReset);
			});	

		if (this.config.storage == 'fs')
			this.powerLoggingService = new LegrandMyHome.FakeGatoHistoryService("energy", this,{storage: 'fs'});
		else
			this.powerLoggingService = new LegrandMyHome.FakeGatoHistoryService("energy", this,{storage: 'googleDrive', path: 'homebridge'});
		
		return [service, this.powerMeterService, this.powerLoggingService];
	}	
}

class MHButton {
	constructor(log, config) {
		this.config = config || {};
		this.mh = config.parent.controller;
		this.name = config.name;
		this.address = config.address;
		this.displayName = config.name;
		this.UUID = UUIDGen.generate(sprintf("button-%s",config.address));
		this.log = log;
		
		this.value = 0;
		this.log.info(sprintf("LegrandMyHome::MHButton (CEN/CEN+) create object: %s", this.address));
	}

	getServices() {
		var service = new Service.AccessoryInformation();
		service.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Simone Tisa")
			.setCharacteristic(Characteristic.Model, "CEN/CEN+")
			.setCharacteristic(Characteristic.FirmwareRevision, version)
			.setCharacteristic(Characteristic.SerialNumber, "Address " + this.address);

		this.statelessSwitch = new Service.Switch(this.name);
		this.statelessSwitch.getCharacteristic(Characteristic.On)
			.on('set', (value,callback) => {
				this.log.debug(sprintf("setOn %s = %s",this.address, value));
				callback(null);
			})
			.on('get', (callback) => {
				this.log.debug(sprintf("getOn %s",this.address));
				callback(null,0);
			});
		return [service, this.statelessSwitch];
	}	
	
}


class MHDryContact {
	constructor(log, config) {
		this.config = config || {};
		this.mh = config.parent.controller;
		this.name = config.name;
		this.address = config.address;
		this.displayName = config.name;
		this.UUID = UUIDGen.generate(sprintf("drycontact-%s",config.address));
		this.log = log;
		this.type = config.type;
		this.numberOpened = 0;
		this.durationhandle = null;
		this.duration = config.duration || 30;
		this.firstGet = true;
		this.lastOpening = 0;
		this.lastActivation = 0;
		this.state = config.state || false;
		this.ExtraPersistedData = {};
		this.log.info(sprintf("LegrandMyHome::MHDryContact create object: %s", this.address));
	}

	identify(callback) {
        this.log("Identify requested!");
        callback(); // success
    }

	getServices() {
		var service = new Service.AccessoryInformation();
		service.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Simone Tisa")
			.setCharacteristic(Characteristic.Model, "Dry-contact Sensor")
			.setCharacteristic(Characteristic.FirmwareRevision, version)
			.setCharacteristic(Characteristic.SerialNumber, "Address " + this.address);

		switch (this.type) {
			case 'Contact':
				this.dryContactService = new Service.ContactSensor(this.name);
				if (this.config.storage == 'fs')
					this.LoggingService = new LegrandMyHome.FakeGatoHistoryService("door", this,{storage: 'fs'});
				else
					this.LoggingService = new LegrandMyHome.FakeGatoHistoryService("door", this,{storage: 'googleDrive', path: 'homebridge'});
				this.dryContactService.addCharacteristic(LegrandMyHome.LastActivation);
				this.dryContactService.addCharacteristic(LegrandMyHome.TimesOpened);
				this.dryContactService.addCharacteristic(LegrandMyHome.ResetTotal);
				this.dryContactService.addCharacteristic(LegrandMyHome.Char118);
				this.dryContactService.addCharacteristic(LegrandMyHome.Char119);
				this.ExtraPersistedData = this.LoggingService.getExtraPersistedData();
				if (this.ExtraPersistedData != undefined) {
					this.numberOpened = this.ExtraPersistedData.numberOpened || 0;
					this.lastOpening = this.ExtraPersistedData.lastOpening || 0;
					this.lastReset = this.ExtraPersistedData.lastReset || 0;
				}

				this.dryContactService.getCharacteristic(Characteristic.ContactSensorState)
					.on('get', (callback) => {
					this.log.debug(sprintf("getContactSensorState %s = %s",this.address, this.state));
					if (this.firstGet) {
						this.firstGet = false;
						this.LoggingService.addEntry({time: moment().unix(), status: this.state});
					}
					callback(null, this.state);
					});
				this.dryContactService.getCharacteristic(Characteristic.ContactSensorState)
					.on('change', () => {
					this.log.debug(sprintf("changeContactSensorState %s = %s",this.address, this.state));
					this.lastOpening = moment().unix()-this.LoggingService.getInitialTime();
					if (this.state) {
						this.ExtraPersistedData = this.LoggingService.getExtraPersistedData();
						if (this.ExtraPersistedData != undefined && this.ExtraPersistedData.numberOpened != undefined)	
							this.numberOpened = this.ExtraPersistedData.numberOpened  + 1;
						else
							this.numberOpened++;
					}
					this.LoggingService.setExtraPersistedData({numberOpened:this.numberOpened, lastOpening: this.lastOpening, lastReset:this.lastReset});
					this.LoggingService.addEntry({time: moment().unix(), status: this.state});
					});
				this.dryContactService.getCharacteristic(LegrandMyHome.ResetTotal)
					.on('set', (value, callback) => {
						this.numberOpened = 0;
						this.lastReset = value;
						this.LoggingService.setExtraPersistedData({numberOpened:this.numberOpened, lastOpening: this.lastOpening, lastReset:this.lastReset});
						this.LoggingService.addEntry({time: moment().unix(), status: this.state});
						callback(null);
					})
					.on('get', (callback) => {
						this.ExtraPersistedData = this.LoggingService.getExtraPersistedData();
						if (this.ExtraPersistedData != undefined ) 
							this.lastReset = this.ExtraPersistedData.lastReset;
						callback(null, this.lastReset);
					});
				this.dryContactService.getCharacteristic(LegrandMyHome.TimesOpened)
					.on('get', (callback) => {
						this.ExtraPersistedData = this.LoggingService.getExtraPersistedData();
						if (this.ExtraPersistedData != undefined ) 
							this.numberOpened = this.ExtraPersistedData.numberOpened;
						this.log.debug(sprintf("getNumberOpened = %f",this.numberOpened));
						callback(null, this.numberOpened);
					});
				this.dryContactService.getCharacteristic(LegrandMyHome.LastActivation)
					.on('get', (callback) => {
						this.ExtraPersistedData = this.LoggingService.getExtraPersistedData();
						if (this.ExtraPersistedData != undefined ) 
							this.lastOpening = this.ExtraPersistedData.lastOpening;
						this.log.debug(sprintf("lastOpening = %f",this.lastOpening));
						callback(null, this.lastOpening);
					});
				return [service, this.dryContactService, this.LoggingService];
			case 'Leak':
				this.dryContactService = new Service.LeakSensor(this.name);
				this.dryContactService.getCharacteristic(Characteristic.LeakDetected)
					.on('get', (callback) => {
					this.log.debug(sprintf("getLeakSensorState %s = %s",this.address, this.state));
					callback(null, this.state);
				});
				return [service, this.dryContactService];
			case 'Motion':
				this.dryContactService = new Service.MotionSensor(this.name);
				if (this.config.storage == 'fs')
					this.LoggingService = new LegrandMyHome.FakeGatoHistoryService("motion", this,{storage: 'fs'});
				else
					this.LoggingService = new LegrandMyHome.FakeGatoHistoryService("motion", this,{storage: 'googleDrive', path: 'homebridge'});
				this.dryContactService.addCharacteristic(LegrandMyHome.Sensitivity);
				this.dryContactService.addCharacteristic(LegrandMyHome.Duration);
				this.dryContactService.addCharacteristic(LegrandMyHome.LastActivation);	
				this.dryContactService.setCharacteristic(LegrandMyHome.Duration,this.duration);
				this.ExtraPersistedData = this.LoggingService.getExtraPersistedData();
				if (this.ExtraPersistedData != undefined) {
					this.lastActivation = this.ExtraPersistedData.lastActivation || 0;
				}		
				this.dryContactService.getCharacteristic(Characteristic.MotionDetected)
					.on('get', (callback) => {
					this.log.debug(sprintf("getMotionSensorState %s = %s",this.address, this.state));
					if (this.firstGet) {
						this.firstGet = false;
						this.LoggingService.addEntry({time: moment().unix(), status: this.state});
					}
					callback(null, this.state);
				});
				this.dryContactService.getCharacteristic(Characteristic.MotionDetected)
					.on('change', () => {
					this.log.debug(sprintf("changeMotionSensorState %s = %s",this.address, this.state));
					this.lastActivation = moment().unix()-this.LoggingService.getInitialTime();
					this.LoggingService.setExtraPersistedData({lastActivation: this.lastActivation});
					this.LoggingService.addEntry({time: moment().unix(), status: this.state});
					
					});
				this.dryContactService.getCharacteristic(LegrandMyHome.Duration)
					.on('set', (value, callback) => {
						this.duration = value;
						callback(null);
					})
					.on('get', (callback) => {
						callback(null, this.duration);
					});
				this.dryContactService.getCharacteristic(LegrandMyHome.LastActivation)
					.on('get', (callback) => {
						this.ExtraPersistedData = this.LoggingService.getExtraPersistedData();
						if (this.ExtraPersistedData != undefined ) 
							this.lastActivation = this.ExtraPersistedData.lastActivation;
						this.log.debug(sprintf("lastActivation = %f",this.lastActivation));
						callback(null, this.lastActivation);
					});
				
				return [service, this.dryContactService, this.LoggingService];
			default:
				this.dryContactService = new Service.ContactSensor(this.name);
				this.dryContactService.getCharacteristic(Characteristic.ContactSensorState)
					.on('get', (callback) => {
					this.log.debug(sprintf("getContactSensorState %s = %s",this.address, this.state));
					callback(null, this.state);
					});
				return [service, this.dryContactService];
		}

		
	}	
}

class MHAux {
	constructor(log, config) {
		this.config = config || {};
		this.mh = config.parent.controller;
		this.name = config.name;
		this.address = config.address;
		this.displayName = config.name;
		this.UUID = UUIDGen.generate(sprintf("aux-%s",config.address));
		this.log = log;
		this.type = config.type;
		
		this.state = false;
		this.log.info(sprintf("LegrandMyHome::MHAux create object: %s", this.address));
	}

	getServices() {
		var service = new Service.AccessoryInformation();
		service.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Simone Tisa")
			.setCharacteristic(Characteristic.Model, "AUX")
			.setCharacteristic(Characteristic.FirmwareRevision, version)
			.setCharacteristic(Characteristic.SerialNumber, "Address " + this.address);

		switch (this.type) {
			case 'Contact':
				this.AUXService = new Service.ContactSensor(this.name);
				this.AUXService.getCharacteristic(Characteristic.ContactSensorState)
					.on('get', (callback) => {
					this.log.debug(sprintf("getContactSensorState %s = %s",this.address, this.state));
					callback(null, this.state);
					});
				break;
			case 'Leak':
				this.AUXService = new Service.LeakSensor(this.name);
				this.AUXService.getCharacteristic(Characteristic.LeakDetected)
					.on('get', (callback) => {
					this.log.debug(sprintf("getLeakSensorState %s = %s",this.address, this.state));
					callback(null, this.state);
				});
				break;
			case 'Motion':
				this.AUXService = new Service.MotionSensor(this.name);
				this.AUXService.getCharacteristic(Characteristic.MotionDetected)
					.on('get', (callback) => {
					this.log.debug(sprintf("getMotionSensorState %s = %s",this.address, this.state));
					callback(null, this.state);
				});
				break;
			case 'Gas':
				this.AUXService = new Service.CarbonMonoxideSensor(this.name);
				this.AUXService.getCharacteristic(Characteristic.CarbonMonoxideDetected)
					.on('get', (callback) => {
					this.log.debug(sprintf("getGasSensorState %s = %s",this.address, this.state));
					callback(null, this.state);
				});
				break;
			default:
				this.AUXService = new Service.ContactSensor(this.name);
				this.AUXService.getCharacteristic(Characteristic.ContactSensorState)
					.on('get', (callback) => {
					this.log.debug(sprintf("getContactSensorState %s = %s",this.address, this.state));
					callback(null, this.state);
					});
				break;
		}

		return [service, this.AUXService];
	}	
}

class MHAlarm {
	constructor(log, config) {
		this.config = config || {};
		this.mh = config.parent.controller;
		this.name = config.name;
		this.displayName = config.name;
		this.UUID = UUIDGen.generate(sprintf("alarm-%s",config.address));
		this.log = log;
		
		this.state = Characteristic.SecuritySystemCurrentState.DISARMED;
		this.target = Characteristic.SecuritySystemCurrentState.DISARMED;
		this.fault = Characteristic.StatusFault.NO_FAULT;
		this.tampered = Characteristic.StatusTampered.NOT_TAMPERED;
		this.lowbattery = Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
		this.batterycharging = Characteristic.ChargingState.NOT_CHARGING;
		this.batterylevel = 100;
		this.zone = [true, true,true,true,false,false,false,false];
		this.active = false;
		this.triggered = false;
	
		this.log.info(sprintf("LegrandMyHome::MHAlarm create object"));
	
	}

	getServices() {
		var service = new Service.AccessoryInformation();
		service.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Simone Tisa")
			.setCharacteristic(Characteristic.Model, "Alarm 3486")
			.setCharacteristic(Characteristic.FirmwareRevision, version)
			.setCharacteristic(Characteristic.SerialNumber, "Name- " + this.name);

		this.alarmService = new Service.SecuritySystem(this.name);
		this.alarmService.getCharacteristic(Characteristic.SecuritySystemCurrentState)
			.on('get', (callback) => {
				this.log.debug(sprintf("alarm current = %d",this.state));
				callback(null, this.state);
			});
		this.alarmService.getCharacteristic(Characteristic.SecuritySystemTargetState)
			.on('get', (callback) => {
				this.log.debug(sprintf("alarm get target = %d",this.target));
				callback(null, this.target);
			})
			.on('set', (value,callback) => {
				this.log.debug(sprintf("alarm set target= %d", this.target));
				callback(null);
			});
		this.alarmService.getCharacteristic(Characteristic.StatusFault)
			.on('get', (callback) => {
				this.log.debug(sprintf("getConsumptio = %s",this.value));
				callback(null, this.fault);
			});
		this.alarmService.getCharacteristic(Characteristic.StatusTampered)
			.on('get', (callback) => {
				this.log.debug(sprintf("getConsumptio = %s",this.value));
				callback(null, this.tampered);
			});
		this.alarmBatteryService = new Service.BatteryService(this.name);
		this.alarmBatteryService.getCharacteristic(Characteristic.StatusLowBattery)
			.on('get', (callback) => {
				this.log.debug(sprintf("alarm current = %d",this.state));
				callback(null, this.lowbattery);
			});
		this.alarmBatteryService.getCharacteristic(Characteristic.BatteryLevel)
			.on('get', (callback) => {
				this.log.debug(sprintf("alarm current = %d",this.state));
				callback(null, this.batterylevel);
			});
		this.alarmBatteryService.getCharacteristic(Characteristic.ChargingState)
			.on('get', (callback) => {
				this.log.debug(sprintf("alarm current = %d",this.state));
				callback(null, this.batterycharging);
			});
		
		
		return [service, this.alarmService, this.alarmBatteryService];
	}	
}

class MHControlledLoad {
	constructor(log, config) {
		this.config = config || {};
		this.mh = config.parent.controller;
		this.name = config.name;
		this.address = config.address;
		this.displayName = config.name;
		this.UUID = UUIDGen.generate(sprintf("controlledload-%s",config.address));
		this.log = log;
		
		this.enabled = true;
		this.forced = 0;
		this.log.info(sprintf("LegrandMyHome::MHControlledLoad create priority: %s", this.address));
	}

	getServices() {
		var service = new Service.AccessoryInformation();
		service.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Simone Tisa")
			.setCharacteristic(Characteristic.Model, "Controlled load")
			.setCharacteristic(Characteristic.FirmwareRevision, version)
			.setCharacteristic(Characteristic.SerialNumber, "Priority " + this.address);

		this.controlledLoad = new LegrandMyHome.ControlledLoadService(this.name);

		this.controlledLoad.getCharacteristic(Characteristic.Active)
			.on('set', (value,callback) => {
				this.log.debug(sprintf("setOn %s = %s",this.address, value));
				
				if (value == 1)
				{
					this.enabled = true;
					this.forced = value;
					this.mh.forcedLoadCommand(this.address,this.forced);
					callback(null);
				}
				else
				{
					this.forced = 0;
					this.controlledLoad.getCharacteristic(Characteristic.Active).getValue(null);
					setTimeout(function() {
						this.forced = 1;
						this.controlledLoad.getCharacteristic(Characteristic.Active).getValue(null);
					}.bind(this),500);
					callback(null);
				}
				
			})
			.on('get', (callback) => {
				this.log.debug(sprintf("getOn %s",this.address));
				callback(null,this.forced);
			});
		this.controlledLoad.getCharacteristic(Characteristic.OutletInUse)
			.on('get', (callback) => {
				this.log.debug(sprintf("getOn %s",this.address));
				callback(null,this.enabled);
			});
		return [service, this.controlledLoad];
	}	
	
}

class MHIrrigation {
	constructor(log, config) {
		this.config = config || {};
		this.mh = config.parent.controller;
		this.name = config.name;
		this.address = config.address;
		this.groups = config.groups || []; 		/* TODO */
		this.pul = config.pul || false; 						
		this.displayName = config.name;
		this.UUID = UUIDGen.generate(sprintf("irrigation-%s",config.address));
		this.log = log;
		this.power = false;
		this.RemDuration = 1;
		this.timer = config.timer || 1;
		this.timerHandle = 0;
		this.log.info(sprintf("LegrandMyHome::MHIrrigation create object: %s", this.address));
		this.mh.addLightBusDevice(this.address);
		var address = this.address.split("/"); 
        this.bus = parseInt(address[0]);
		this.ambient = parseInt(address[1]);
		this.pl = parseInt(address[2]);
		this.lastActivation = 0;
		this.ExtraPersistedData = {};
		this.firstGet = true;
	}

	getServices() {
		var service = new Service.AccessoryInformation();
		service.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Simone Tisa")
			.setCharacteristic(Characteristic.Model, "Irrigation")
			.setCharacteristic(Characteristic.FirmwareRevision, version)
			.setCharacteristic(Characteristic.SerialNumber, "Address " + this.address);

		this.IrrigationService = new Service.Valve(this.name);

		// just to make the irrigation icon show in Eve, real history signature needed	
		this.IrrigationService.addCharacteristic(LegrandMyHome.LastActivation);
		if (this.config.storage == 'fs')
			this.LoggingService = new LegrandMyHome.FakeGatoHistoryService("motion", this,{storage: 'fs'});
		else
			this.LoggingService = new LegrandMyHome.FakeGatoHistoryService("motion", this,{storage: 'googleDrive', path: 'homebridge'});
		this.ExtraPersistedData = this.LoggingService.getExtraPersistedData();
		if (this.ExtraPersistedData != undefined) {
			this.lastActivation = this.ExtraPersistedData.lastActivation || 0;
		}	

		this.IrrigationService.setCharacteristic(Characteristic.ValveType,1);
		this.IrrigationService.setCharacteristic(Characteristic.SetDuration,this.timer);
		this.IrrigationService.getCharacteristic(Characteristic.Active)
			.on('set', (_value, callback) => {
				this.log.debug(sprintf("setIrrigation %s = %s",this.address, _value));
				this.power = _value;
				if (this.power)
				{
					this.mh.relayTimedOn(this.address,this.timer/3600,this.timer/60,this.timer%60);	
				}
				else
				{
					this.mh.relayCommand(this.address,this.power);
				}

				callback(null);
			})
			.on('get', (callback) => {
				this.log.debug(sprintf("getIrrigation %s = %s",this.address, this.power));
				callback(null, this.power);
			});
		this.IrrigationService.getCharacteristic(Characteristic.InUse)
			.on('get', (callback) => {
				if (this.firstGet) {
					this.firstGet = false;
					this.LoggingService.addEntry({time: moment().unix(), status: this.power});
				}
				callback(null, this.power);
			})
			.on('change',() => {
				if (this.power)
				{
					setTimeout(function () {
						this.mh.getRelayDuration(this.address)}.bind(this),1000);
				}
				else
				{
					clearInterval(this.timerHandle);
					this.RemDuration = 0;
					this.IrrigationService.setCharacteristic(Characteristic.RemainingDuration,this.RemDuration);
				}				
				this.log.debug(sprintf("changeIrrigation %s = %s",this.address, this.power));
				this.lastActivation = moment().unix()-this.LoggingService.getInitialTime();
				this.LoggingService.setExtraPersistedData({lastActivation: this.lastActivation});
				this.LoggingService.addEntry({time: moment().unix(), status: this.power});	
			});	
		this.IrrigationService.getCharacteristic(Characteristic.SetDuration)
			.on('set', (time, callback) => {
				this.timer = time;
				callback(null);
			})
			.on('get', (callback) => {	
				callback(null, this.timer);	
			});
		this.IrrigationService.getCharacteristic(Characteristic.RemainingDuration)
			.on('set', (time, callback) => {
				this.RemDuration = time;
				callback(null);
			})
			.on('get', (callback) => {
				callback(null, this.RemDuration);
			});
		this.IrrigationService.getCharacteristic(LegrandMyHome.LastActivation)
			.on('get', (callback) => {
				this.ExtraPersistedData = this.LoggingService.getExtraPersistedData();
				if (this.ExtraPersistedData != undefined ) 
					this.lastActivation = this.ExtraPersistedData.lastActivation;
				this.log.debug(sprintf("lastActivation = %f",this.lastActivation));
				callback(null, this.lastActivation);
			});
		return [service, this.IrrigationService, this.LoggingService];
	}
}