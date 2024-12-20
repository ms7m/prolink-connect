import { RocksDB } from 'rocksdb';
import lodash from 'lodash';
import { EntityFK, Playlist, PlaylistEntry, Track } from '../entities.js';

const { camelCase, mapKeys, mapValues, partition, snakeCase } = lodash;

/**
 * Table names available - we'll use these as prefixes for our RocksDB keys
 */
export enum Table {
	Artist = 'artist',
	Album = 'album',
	Genre = 'genre',
	Color = 'color',
	Label = 'label',
	Key = 'key',
	Artwork = 'artwork',
	Playlist = 'playlist',
	PlaylistEntry = 'playlist_entry',
	Track = 'track',
}

const trackRelations = [
	'artwork',
	'artist',
	'originalArtist',
	'remixer',
	'composer',
	'album',
	'label',
	'genre',
	'color',
	'key',
];

const trackRelationTableMap: Record<string, string> = {
	originalArtist: 'artist',
	remixer: 'artist',
	composer: 'artist',
};

/**
 * Object Relation Mapper as an abstraction on top of a RocksDB
 * connection.
 */
export class MetadataORM {
	#db: RocksDB;
	#indices: Map<string, Set<string>>;

	constructor() {
		this.#db = new RocksDB('metadata.db');
		this.#indices = new Map();
		
		// Initialize indices for each table
		Object.values(Table).forEach(table => {
			this.#indices.set(table, new Set());
		});
	}

	close() {
		this.#db.close();
	}

	/**
	 * Generate a key for storing in RocksDB
	 */
	private generateKey(table: Table, id: number | string): string {
		if (id === undefined || id === null) {
			throw new Error(`Invalid id ${id} for table ${table}`);
		}
		return `${table}:${id}`;
	}

	/**
	 * Insert a entity object into the database.
	 */
	insertEntity(table: Table, object: Record<string, any>) {
		const id = object.id;
		const key = this.generateKey(table, id);

		// Translate date and booleans and handle undefined
		const data = mapValues(object, value => {
			if (value === undefined) {
				return null;
			}
			if (value instanceof Date) {
				return value.toISOString();
			}
			if (typeof value === 'boolean') {
				return Number(value);
			}
			return value;
		});

		// Store the serialized object
		this.#db.putSync(key, JSON.stringify(data));
		
		// Update index
		this.#indices.get(table)?.add(key);
	}

	/**
	 * Locate a track by ID in the database
	 */
	findTrack(id: number): Track {
		const key = this.generateKey(Table.Track, id);
		const trackData = this.#db.getSync(key);
		
		if (!trackData) {
			throw new Error(`Track ${id} not found`);
		}

		// Parse the stored JSON data
		const trackRow = JSON.parse(trackData);
		const track = mapKeys(trackRow, (_, k) => camelCase(k)) as Track<EntityFK.WithFKs>;

		track.beatGrid = null;
		track.cueAndLoops = null;
		track.waveformHd = null;

		// Restore dates and booleans
		track.autoloadHotcues = !!track.autoloadHotcues;
		track.kuvoPublic = !!track.kuvoPublic;
		track.analyzeDate = track.analyzeDate ? new Date(track.analyzeDate) : new Date();
		track.dateAdded = track.dateAdded ? new Date(track.dateAdded) : new Date();

		// Query all track relationships
		for (const relation of trackRelations) {
			const fkName = `${relation}Id`;
			const fk = track[fkName as keyof typeof track];
			const table = snakeCase(trackRelationTableMap[relation] ?? relation);

			delete (track as any)[fkName];
			(track as any)[relation] = null;

			if (fk === null || fk === undefined) {
				continue;
			}

			if (typeof fk !== 'string' && typeof fk !== 'number') {
				continue;
			}

			const relationKey = this.generateKey(table as Table, fk);
			const relationData = this.#db.getSync(relationKey);
			
			if (relationData) {
				(track as any)[relation] = JSON.parse(relationData);
			}
		}

		return track as Track;
	}

	/**
	 * Query for a list of {folders, playlists, tracks} given a playlist ID.
	 */
	findPlaylist(playlistId?: number) {
		const playlistPrefix = this.generateKey(Table.Playlist, playlistId ?? 'root');
		const playlistEntries: Playlist[] = [];

		// Scan all playlists to find children
		for (const key of this.#indices.get(Table.Playlist) ?? []) {
			const data = this.#db.getSync(key);
			if (data) {
				const playlist = JSON.parse(data) as Playlist;
				if (playlist.parentId === playlistId) {
						playlistEntries.push(playlist);
				}
			}
		}

		const [folders, playlists] = partition(playlistEntries, p => p.isFolder);

		// Find playlist entries
		const entryPrefix = this.generateKey(Table.PlaylistEntry, playlistId ?? 'root');
		const trackEntries: PlaylistEntry<EntityFK.WithFKs>[] = [];

		for (const key of this.#indices.get(Table.PlaylistEntry) ?? []) {
			const data = this.#db.getSync(key);
			if (data) {
				const entry = JSON.parse(data) as PlaylistEntry<EntityFK.WithFKs>;
				if (entry.playlistId === playlistId) {
						trackEntries.push(entry);
				}
			}
		}

		return { folders, playlists, trackEntries };
	}
}
