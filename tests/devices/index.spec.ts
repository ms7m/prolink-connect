import {jest} from '@jest/globals';

// import {mockDevice} from 'tests/utils.ts';

import {Socket} from 'dgram';
import {EventEmitter} from 'events';
import {PROLINK_HEADER} from 'src/constants.ts';
import DeviceManager from 'src/devices/index.ts';
import {deviceToPacket, mockDevice} from 'tests/utils.ts';

// jest.unstable_mockModule('src/devices/utils.ts', () => ({
// 	deviceFromPacket: jest.fn(),
// }));

// jest.unstable_mockModule('src/devices/index.ts', () => ({
// 	default: jest.fn().mockImplementation(() => {
// 		return {getDeviceEnsured: jest.fn()};
// 	}),
// }));

// async function getDFPMock() {
// 	const {deviceFromPacket} = await import('src/devices/utils.ts');
// 	const DeviceManager = await import('src/devices/index.ts').then(m => m.default);

// 	return {
// 		dfpMock: deviceFromPacket as jest.Mock<typeof deviceFromPacket>,
// 		DeviceManager: DeviceManager as jest.MockedClass<typeof DeviceManager>,
// 	};
// }

jest.useFakeTimers();

describe('DeviceManager', () => {
	const mockSocket = new EventEmitter() as Socket;

	it('produces device lifecycle events', async () => {
		// const {dfpMock, DeviceManager} = await getDFPMock();

		const dm = new DeviceManager(mockSocket, {deviceTimeout: 100});

		const announceFn = jest.fn();
		dm.on('announced', announceFn);

		const connectedFn = jest.fn();
		dm.on('connected', connectedFn);

		const disconnectedFn = jest.fn();
		dm.on('disconnected', disconnectedFn);

		// Mocked mesage value
		const deadBeef = Buffer.from([...PROLINK_HEADER, ...Buffer.from([0xde, 0xad, 0xbe, 0xef])]);

		// Trigger device announcment
		const deviceExample = mockDevice();
		mockSocket.emit('message', deviceToPacket(deviceExample));

		// expect(dfpMock).toHaveBeenCalledWith(deadBeef);
		// expect(connectedFn).toHaveBeenCalledWith(deviceExample);
		// expect(announceFn).toHaveBeenCalledWith(deviceExample);
		expect(dm.devices.size).toBe(1);
		expect(dm.devices.get(1)?.name).toBe(deviceExample.name);
		// expect(dm.devices.get(1)).toBe(deviceExample);

		// Reset our emitter mocks for the next announcment
		announceFn.mockClear();
		connectedFn.mockReset();

		// Move forward 75ms, the device should not have timed out yet
		jest.advanceTimersByTime(75);

		// Trigger device announcment
		mockSocket.emit('message', deadBeef);

		expect(connectedFn).not.toHaveBeenCalled();
		// expect(announceFn).toHaveBeenCalledWith(deviceExample);

		// Device is still kept alive, as it has not expired since its last
		// announcment
		jest.advanceTimersByTime(75);

		// Device will now timeout
		jest.advanceTimersByTime(25);
		// expect(disconnectedFn).toHaveBeenCalledWith(deviceExample);
		expect(dm.devices.size).toBe(0);

		// Reconfigure for longer timeout
		dm.reconfigure({deviceTimeout: 500});

		// Device reconnects and emits a new connection event
		connectedFn.mockReset();
		mockSocket.emit('message', deadBeef);

		// expect(connectedFn).toHaveBeenCalledWith(deviceExample);

		disconnectedFn.mockReset();

		// Device will not timeout with reconfigured timeout
		jest.advanceTimersByTime(400);
		expect(disconnectedFn).not.toHaveBeenCalled();

		// Device will now timeout
		jest.advanceTimersByTime(100);
		// expect(disconnectedFn).toHaveBeenCalledWith(deviceExample);
	});

	// it('does not announce invalid announce packets', async () => {
	// 	const {dfpMock, DeviceManager} = await getDFPMock();
	// 	const dm = new DeviceManager(mockSocket, {deviceTimeout: 100});

	// 	const announceFn = jest.fn();
	// 	dm.on('announced', announceFn);

	// 	dfpMock.mockReturnValue(null);

	// 	// Trigger device announcment
	// 	mockSocket.emit('message', Buffer.of());

	// 	expect(announceFn).not.toHaveBeenCalled();
	// 	expect(dm.devices.size).toBe(0);
	// });

	// it('does not announce or track virtual CDJ announcments', async () => {
	// 	// const {dfpMock, DeviceManager} = await getDFPMock();
	// 	const dm = new DeviceManager(mockSocket, {deviceTimeout: 100});

	// 	const announceFn = jest.fn();
	// 	dm.on('announced', announceFn);

	// 	const deviceExample = mockDevice({name: VIRTUAL_CDJ_NAME});

	// 	// dfpMock.mockReturnValue(deviceExample);

	// 	// Trigger device announcment
	// 	mockSocket.emit('message', Buffer.of());

	// 	expect(announceFn).not.toHaveBeenCalled();
	// 	expect(dm.devices.size).toBe(0);
	// });

	// it('waits for a device to appear using getDeviceEnsured', async () => {
	// 	const {dfpMock, DeviceManager} = await getDFPMock();
	// 	const dm = new DeviceManager(mockSocket, {deviceTimeout: 100});

	// 	const deviceExample = mockDevice();
	// 	const gotDevice = dm.getDeviceEnsured(1);

	// 	jest.advanceTimersByTime(75);

	// 	dfpMock.mockReturnValue(deviceExample);

	// 	// Trigger device announcment
	// 	mockSocket.emit('message', Buffer.of());

	// 	await expect(gotDevice).resolves.toBe(deviceExample);
	// });

	it('timesout when waiting for device using getDeviceEnsured', async () => {
		// const {DeviceManager} = await getDFPMock();
		const dm = new DeviceManager(mockSocket, {deviceTimeout: 100});

		const gotDevice = dm.getDeviceEnsured(1, 150);

		jest.advanceTimersByTime(150);
		await expect(gotDevice).resolves.toBe(null);
	});

	// it('immedaitely returns a device when it already exists using getDeviceEnsured', async () => {
	// 	const {dfpMock, DeviceManager} = await getDFPMock();
	// 	const dm = new DeviceManager(mockSocket, {deviceTimeout: 100});
	// 	const deviceExample = mockDevice();
	// 	dfpMock.mockReturnValue(deviceExample);
	// 	mockSocket.emit('message', Buffer.of());

	// 	await expect(dm.getDeviceEnsured(1, 100)).resolves.toBe(deviceExample);
	// });
});
