# Byteball-to-TCP Proxy
This program acts a as TCP proxy on the [Byteball network](https://byteball.org).
By default, it serves the current time from telnet://india.colorado.edu (port 13).
However, it can trivially be configured to serve any TCP service over the Byteball network.

## Features
Incoming text messages are forwarded to the predefined host. Data that arrives as a response is sent back to the guest device.
If the *open* parameter is defined its value is sent to the server immediately after tunnel establishment. The `%s` part in the
*open* parameter is replaced by the Byteball device address.

## Demo
In the [Byteball wallet](https://byteball.org/#download), go to PAIRED DEVICES -> Add a new device -> Accept invitation from
the other device. Then scan the following QR code, or input the address manually.

![A/SCXz5tNuJDLuCO8PXpsfUoL7dCMBGnvSST7z0YPXjd@byteball.org/bb#0000 ""](https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=byteball%3AA%2FSCXz5tNuJDLuCO8PXpsfUoL7dCMBGnvSST7z0YPXjd%40byteball.org%2Fbb%230000)

[A/SCXz5tNuJDLuCO8PXpsfUoL7dCMBGnvSST7z0YPXjd@byteball.org/bb#0000](byteball:A/SCXz5tNuJDLuCO8PXpsfUoL7dCMBGnvSST7z0YPXjd@byteball.org/bb#0000)

## Setup
- `npm install`
- `node bb2tcp.js <host> <port> <name> <desc> <open>`

  *node bb2tcp.js india.colorado.edu 13 "Current Time" "Welcome!" "device %s"*
- Get the *pairing code* from the process log.

