import {bringOnline, MixstatusProcessor} from '../dist/index.js';

import signale from 'signale';

signale.await('Bringing up prolink network');
const network = await bringOnline();
signale.success('Network online, preparing to connect');

network.deviceManager.on('connected', d =>
	signale.star('New device: %s [ip: %s] [id: %s]', d.name, d.ip.correctForm(), d.id),
);

signale.await('Autoconfiguring network.. waiting for devices');
await network.autoconfigFromPeers();
signale.await('Autoconfigure successfull!');

signale.await('Connecting to network!');
network.connect();

if (!network.isConnected()) {
	signale.error('Failed to connect to the network');
	process.exit(1);
}

signale.star('Network connected! Network services initalized');

const processor = new MixstatusProcessor();

processor.on('nowPlaying', async state => {
	const {trackDeviceId, trackSlot, trackType, trackId} = state;

	const track = await network.db.getMetadata({
		deviceId: trackDeviceId,
		trackSlot,
		trackType,
		trackId,
	});

	if (track === null) {
		signale.warn('no track');
		return;
	}

	// const art = await network.db.getArtwork({
	// 	deviceId: trackDeviceId,
	// 	trackSlot,
	// 	trackType,
	// 	track,
	// });

	// const waveform = await network.db.getWaveforms({
	// 	deviceId: trackDeviceId,
	// 	trackSlot,
	// 	trackType,
	// 	track,
	// });

	const metadata = await network.db.getMetadata({
		deviceId: trackDeviceId,
		trackSlot,
		trackType,
		trackId,
	});

	console.log(trackId, track.title, track.artist);
	console.log(metadata);

	// if (art) {
	// 	console.log(
	// 		await terminalImage.buffer(art, {
	// 			width: '10%',
	// 		}),
	// 	);
	// }
});

network.statusEmitter.on('status', s => processor.handleState(s));
