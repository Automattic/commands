import { act } from '@testing-library/react';

import type { Command } from './types';

/** Creates a Command with sensible defaults — only `id` and `title` are required. */
export function cmd( overrides: Partial< Command > & { id: string; title: string } ): Command {
	return { route: '/test', ...overrides };
}

export interface KeyModifiers {
	meta?: boolean;
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
}

/**
 * Dispatches a `keydown` event on `document` with the given key and modifier
 * state, wrapped in `act()` so any resulting React state updates are flushed
 * before assertions.
 */
export function dispatchKey( key: string, modifiers: KeyModifiers = {} ): void {
	act( () => {
		document.dispatchEvent(
			new KeyboardEvent( 'keydown', {
				key,
				metaKey: modifiers.meta ?? false,
				ctrlKey: modifiers.ctrl ?? false,
				shiftKey: modifiers.shift ?? false,
				altKey: modifiers.alt ?? false,
				bubbles: true,
				cancelable: true,
			} )
		);
	} );
}
