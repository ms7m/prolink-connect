/* istanbul ignore file */

import * as ip from 'ip-address';

import {readFile} from 'fs/promises';

import * as path from 'node:path';
import {PROLINK_HEADER} from 'src/constants.ts';
import {Device, DeviceType} from 'src/types.ts';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export function readMock(path: string) {
	return readFile(`${__dirname}/_data/${path}`);
}

export function mockDevice(extra?: Partial<Device>): Device {
	return {
		id: 1,
		type: DeviceType.CDJ,
		name: 'CDJ-test',
		ip: new ip.Address4('10.0.0.1'),
		macAddr: Uint8Array.of(0x01, 0x02, 0x03, 0x04, 0x05, 0x06),
		...extra,
	};
}

export function deviceToPacket(device: Device) {
	const packet = Buffer.alloc(0x38);

	// Insert the PROLINK_HEADER at the start
	for (let i = 0; i < PROLINK_HEADER.length; i++) {
		packet[i] = PROLINK_HEADER[i];
	}

	// Set the specific byte at 0x0a to 0x06
	packet[0x0a] = 0x06;

	// Insert the device name (max 20 characters, padded with null bytes if necessary)
	const nameBuffer = Buffer.from(device.name, 'ascii');
	nameBuffer.copy(packet, 0x0c);
	packet.fill(0x00, 0x0c + nameBuffer.length, 0x0c + 20);

	// Set the device ID at 0x24
	packet[0x24] = device.id;

	// Insert the MAC address at 0x26
	for (let i = 0; i < device.macAddr.length; i++) {
		packet[0x26 + i] = device.macAddr[i];
	}

	// Convert the IP address to an integer using the ip-address module and write it at 0x2c
	const ipAddrInt = parseInt(device.ip.toHex(), 16);
	packet.writeUInt32BE(ipAddrInt, 0x2c);

	// Set the device type at 0x34
	packet[0x34] = device.type;

	return packet;
}
