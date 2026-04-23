import { useEffect, useRef } from 'react';

interface ParsedHotkey {
	meta: boolean;
	ctrl: boolean;
	shift: boolean;
	alt: boolean;
	key: string;
}

function isMac(): boolean {
	if ( typeof navigator === 'undefined' ) {
		return false;
	}
	return /Mac|iPod|iPhone|iPad/.test( navigator.platform );
}

function parseHotkey( triggerKey: string ): ParsedHotkey {
	const parts = triggerKey.split( '+' ).map( part => part.trim() );
	const key = ( parts.pop() ?? '' ).toLowerCase();
	const modifiers = parts.map( modifier => modifier.toLowerCase() );

	const useMod = modifiers.includes( 'mod' );
	const mac = useMod && isMac();

	return {
		meta: modifiers.includes( 'meta' ) || ( useMod && mac ),
		ctrl: modifiers.includes( 'ctrl' ) || modifiers.includes( 'control' ) || ( useMod && ! mac ),
		shift: modifiers.includes( 'shift' ),
		alt: modifiers.includes( 'alt' ) || modifiers.includes( 'option' ),
		key,
	};
}

/**
 * Attaches a global `keydown` listener on `document` that invokes `callback`
 * when the configured hotkey is pressed.
 *
 * `triggerKey` is a `+`-separated combination of modifiers and a key, e.g.
 * `"Meta+k"`, `"Ctrl+Shift+p"`, or `"Mod+k"`. The `Mod` modifier resolves to
 * Cmd on macOS and Ctrl on other platforms.
 *
 * The listener is removed on unmount and re-attached when `triggerKey` changes.
 * The latest `callback` is always invoked without needing to re-bind the listener.
 */
export function useHotkey( triggerKey: string, callback: () => void ): void {
	const callbackRef = useRef( callback );

	useEffect( () => {
		callbackRef.current = callback;
	}, [ callback ] );

	useEffect( () => {
		const hotkey = parseHotkey( triggerKey );

		const handleKeyDown = ( event: KeyboardEvent ): void => {
			if (
				event.key.toLowerCase() === hotkey.key &&
				event.metaKey === hotkey.meta &&
				event.ctrlKey === hotkey.ctrl &&
				event.shiftKey === hotkey.shift &&
				event.altKey === hotkey.alt
			) {
				event.preventDefault();
				callbackRef.current();
			}
		};

		document.addEventListener( 'keydown', handleKeyDown );
		return () => {
			document.removeEventListener( 'keydown', handleKeyDown );
		};
	}, [ triggerKey ] );
}
