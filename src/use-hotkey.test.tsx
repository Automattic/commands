import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { dispatchKey } from './test-utils';
import { useHotkey } from './use-hotkey';

describe( 'useHotkey', () => {
	it( 'fires callback on Meta+K when Meta+k is configured', () => {
		const callback = vi.fn();
		renderHook( () => useHotkey( 'Meta+k', callback ) );

		dispatchKey( 'k', { meta: true } );

		expect( callback ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'fires on the platform-appropriate Mod modifier', () => {
		const callback = vi.fn();
		renderHook( () => useHotkey( 'Mod+k', callback ) );

		dispatchKey( 'k', { meta: true } );
		dispatchKey( 'k', { ctrl: true } );

		expect( callback ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'respects a custom triggerKey with multiple modifiers', () => {
		const callback = vi.fn();
		renderHook( () => useHotkey( 'Ctrl+Shift+p', callback ) );

		dispatchKey( 'p', { ctrl: true, shift: true } );
		expect( callback ).toHaveBeenCalledTimes( 1 );

		dispatchKey( 'p', { ctrl: true } );
		expect( callback ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'does not fire on non-matching keys or modifier combinations', () => {
		const callback = vi.fn();
		renderHook( () => useHotkey( 'Meta+k', callback ) );

		dispatchKey( 'j', { meta: true } );
		dispatchKey( 'k', {} );
		dispatchKey( 'k', { ctrl: true } );
		dispatchKey( 'k', { meta: true, shift: true } );

		expect( callback ).not.toHaveBeenCalled();
	} );

	it( 'removes the listener on unmount', () => {
		const callback = vi.fn();
		const { unmount } = renderHook( () => useHotkey( 'Meta+k', callback ) );

		unmount();

		dispatchKey( 'k', { meta: true } );

		expect( callback ).not.toHaveBeenCalled();
	} );

	it( 'invokes the latest callback without re-binding on every render', () => {
		const first = vi.fn();
		const second = vi.fn();
		const { rerender } = renderHook(
			( { callback }: { callback: () => void } ) => useHotkey( 'Meta+k', callback ),
			{ initialProps: { callback: first } }
		);

		rerender( { callback: second } );

		dispatchKey( 'k', { meta: true } );

		expect( first ).not.toHaveBeenCalled();
		expect( second ).toHaveBeenCalledTimes( 1 );
	} );
} );
