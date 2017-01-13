# MyHomePlugin
Legrand (BTicino) MyHome plugin for homebridge: https://github.com/nfarina/homebridge

Legrand MyHome (http://www.homesystems-legrandgroup.com/BtHomeSystems/home.action) is an Home Automation solution that can manage:
- lighting (standard on/off/dimmed lights)
- thermoregulation 
- curtains, doors
- security systems

With this plugin, the support of a IP gateway installed in your plant and a configuration of all installed 
systems (MyHome does not support the autodiscovery of the system) you can control it. You need to disable the OpenWebNet password-based
authentication from the IP of the device that runs homebridge (ie. Raspberry) or set the auhentication to HMAC; this software does not 
support the proprietary "OWN" encryption schema even if was reverse-engineered and published on a wiki years ago. HMAC authentication is
supported by all recent IP gateways or older one with updated firmware (eg. F454 with v2 firmware).

# Installation (TBD)
Install plugin with npm install -g homebridge-myhome
Add platform within config.json of you homebridge instance:

    {
        "platforms": [{
            "platform": "MyHome Gateway",
            "ipaddress": "192.168.1.1",
            "password": "12345",
            "discovery": false,
            "devices": [
                    /*Static list of devices*/
                ]
            }], 
        "bridge": {
            "username": "CC:22:3D:E3:CE:31", 
            "name": "MyHome HomeBridge Adapter", 
            "pin": "342-52-220", 
            "port": 51826
        }, 
        "description": "My Fantastic Legrand MyHome System", 
        "accessories": []
    }

Restart homebridge
Enjoy!

# Installation (TBD)

Please wait

## Configuration

Please wait 

# TODOS

- Reconnection and infinite retry
- Semi-auto discovery and/or read a plant configuration from MyHomeSuite configuration file
- Read the correct light level of 100-levels dimmer
- Read the light level state of all devices in all buses
- Re-order the code

# Disclaimer

I'm furnishing this software "as is". I do not provide any warranty of the item whatsoever, whether express, implied, or statutory, including, but not limited to, any warranty of merchantability or fitness for a particular purpose or any warranty that the contents of the item will be error-free.
The development of this module is not supported by Legrand, BTicino or Apple. These vendors and me are not responsible for direct, indirect, incidental or consequential damages resulting from any defect, error or failure to perform.  