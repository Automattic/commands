import { useCallback, useMemo, useState } from 'react';

import type { Command } from '../types';

export interface RecentCommandEntry {
	id: string;
	timestamp: number;
}

export interface UseRecentCommandsOptions {
	storageKey?: string;
	limit?: number;
}

export interface UseRecentCommandsResult {
	recent: Command[];
	addRecent: ( id: string ) => void;
}

const DEFAULT_STORAGE_KEY = '@automattic/commands:recent';
const DEFAULT_LIMIT = 5;

function isRecentEntry( value: unknown ): value is RecentCommandEntry {
	return (
		typeof value === 'object' &&
		value !== null &&
		'id' in value &&
		typeof value.id === 'string' &&
		'timestamp' in value &&
		typeof value.timestamp === 'number'
	);
}

function readStorage( key: string ): RecentCommandEntry[] {
	if ( typeof window === 'undefined' ) {
		return [];
	}
	try {
		const raw = window.localStorage.getItem( key );
		if ( ! raw ) {
			return [];
		}
		const parsed: unknown = JSON.parse( raw );
		if ( ! Array.isArray( parsed ) ) {
			return [];
		}
		return parsed.filter( isRecentEntry );
	} catch {
		return [];
	}
}

function writeStorage( key: string, value: RecentCommandEntry[] ): void {
	if ( typeof window === 'undefined' ) {
		return;
	}
	try {
		window.localStorage.setItem( key, JSON.stringify( value ) );
	} catch {
		// Swallow: SSR, private browsing, quota exceeded, disabled storage.
	}
}

/**
 * Tracks recently-selected command IDs in `localStorage`.
 *
 * Returns the recent commands (newest-first), filtered to IDs that still exist in
 * `commands` — stale entries are silently dropped on read without rewriting
 * storage. `addRecent(id)` prepends an entry with the current timestamp,
 * deduplicates by ID, and trims to `limit`.
 *
 * Storage failures (SSR, private browsing, disabled storage, quota) are
 * swallowed; the hook degrades to an in-memory list for the session.
 */
export function useRecentCommands(
	commands: Command[],
	options: UseRecentCommandsOptions = {}
): UseRecentCommandsResult {
	const { storageKey = DEFAULT_STORAGE_KEY, limit = DEFAULT_LIMIT } = options;

	const [ trackedKey, setTrackedKey ] = useState( storageKey );
	const [ stored, setStored ] = useState< RecentCommandEntry[] >( () => readStorage( storageKey ) );

	if ( storageKey !== trackedKey ) {
		setTrackedKey( storageKey );
		setStored( readStorage( storageKey ) );
	}

	const commandsById = useMemo(
		() => new Map( commands.map( command => [ command.id, command ] ) ),
		[ commands ]
	);

	const recent = useMemo(
		() =>
			stored
				.map( entry => commandsById.get( entry.id ) )
				.filter( ( command ): command is Command => Boolean( command ) )
				.slice( 0, limit ),
		[ stored, commandsById, limit ]
	);

	const addRecent = useCallback(
		( id: string ) => {
			setStored( prev => {
				const withoutStaleOrDuplicate = prev.filter(
					entry => entry.id !== id && commandsById.has( entry.id )
				);
				const next = [ { id, timestamp: Date.now() }, ...withoutStaleOrDuplicate ].slice(
					0,
					limit
				);
				writeStorage( storageKey, next );
				return next;
			} );
		},
		[ storageKey, limit, commandsById ]
	);

	return { recent, addRecent };
}
