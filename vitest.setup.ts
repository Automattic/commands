import '@testing-library/jest-dom/vitest';

function createLocalStorage() {
	const store = new Map< string, string >();

	return {
		get length() {
			return store.size;
		},
		clear() {
			store.clear();
		},
		getItem( key: string ) {
			return store.get( key ) ?? null;
		},
		key( index: number ) {
			let currentIndex = 0;

			for ( const key of store.keys() ) {
				if ( currentIndex === index ) {
					return key;
				}

				currentIndex += 1;
			}

			return null;
		},
		removeItem( key: string ) {
			store.delete( key );
		},
		setItem( key: string, value: string ) {
			store.set( key, String( value ) );
		},
	};
}

Object.defineProperty( window, 'localStorage', {
	value: createLocalStorage(),
	configurable: true,
} );

// jsdom does not implement ResizeObserver; cmdk requires it.
global.ResizeObserver = class ResizeObserver {
	public observe() {}
	public unobserve() {}
	public disconnect() {}
};

// jsdom does not implement scrollIntoView; cmdk calls it on the active item.
Element.prototype.scrollIntoView = function () {};
