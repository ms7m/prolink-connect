import {fetchFile} from 'src/nfs/index.ts';
import {Device, MediaSlot} from 'src/types.ts';

interface AnlzLoaderOpts {
	device: Device;
	slot: MediaSlot.RB | MediaSlot.USB | MediaSlot.SD;
}

export function anlzLoader(opts: AnlzLoaderOpts) {
	return (path: string) => fetchFile({...opts, path});
}
