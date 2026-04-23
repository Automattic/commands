import { isHotkey } from 'is-hotkey';
import { useEffect, useRef } from 'react';

/**
 * Attaches a global `keydown` listener on `document` that invokes `callback`
 * when the configured hotkey is pressed.
 *
 * `triggerKey` is a `+`-separated combination of modifiers and a key, e.g.
 * `"Meta+k"`, `"Ctrl+Shift+p"`, or `"Mod+k"`. The `Mod` modifier follows the
 * standard Cmd/Ctrl platform convention.
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
		const matchesHotkey = isHotkey( triggerKey, { byKey: true } );

		const handleKeyDown = ( event: KeyboardEvent ): void => {
			if ( matchesHotkey( event ) ) {
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
