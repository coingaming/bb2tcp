# Byteball-to-TCP Proxy
This program acts a as TCP proxy on the [Byteball network](https://byteball.org).
For the purpose of demonstration, it serves [the current time](telnet://india.colorado.edu:13).
However, it can trivially be configured to serve any TCP service over the Byteball network.

## Features
Incoming text messages are forwarded to the predefined host. Data that arrives as a response is sent back to the guest device.

## Demo
In the [Byteball wallet](https://byteball.org/#download), go to PAIRED DEVICES -> Add a new device -> Accept invitation from
the other device. Then scan the following QR code, or input the address manually.

![AhzAGwjEe73H2Xz71rdLoOczI8YHGuJPHQWQT6QTLsve@byteball.org/bb#0000 ""](https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=byteball%3AAhzAGwjEe73H2Xz71rdLoOczI8YHGuJPHQWQT6QTLsve%40byteball.org%2Fbb%230000)

[AhzAGwjEe73H2Xz71rdLoOczI8YHGuJPHQWQT6QTLsve@byteball.org/bb#0000](byteball:AhzAGwjEe73H2Xz71rdLoOczI8YHGuJPHQWQT6QTLsve@byteball.org/bb#0000)

## Setup
- `npm install`
- `node bb2tcp.js <host> <port> <name> <desc>`
  *node bb2tcp.js india.colorado.edu 13 "Current Time" "Enjoy your free time..." *
- Get the *pairing code* from the process log.

