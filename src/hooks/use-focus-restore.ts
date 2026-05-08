import { useEffect, useRef } from 'react';

/**
 * Captures the focused element while `open` is `true` and restores focus to it
 * after `open` flips back to `false` (e.g. when a dialog closes). The restored
 * element is checked for connectedness so a removed node won't get focus.
 */
export function useFocusRestore( open: boolean ): {
	captureFocus: () => void;
} {
	const previousFocusRef = useRef< HTMLElement | null >( null );

	useEffect( () => {
		if ( open ) {
			return;
		}

		const previousFocus = previousFocusRef.current;
		previousFocusRef.current = null;

		if ( ! previousFocus?.isConnected ) {
			return;
		}

		const timeoutId = window.setTimeout( () => {
			if ( previousFocus.isConnected ) {
				previousFocus.focus();
			}
		}, 0 );

		return () => {
			window.clearTimeout( timeoutId );
		};
	}, [ open ] );

	const captureFocus = () => {
		previousFocusRef.current =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
	};

	return { captureFocus };
}
