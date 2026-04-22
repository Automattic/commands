import '@testing-library/jest-dom/vitest';

// jsdom does not implement ResizeObserver; cmdk requires it.
global.ResizeObserver = class ResizeObserver {
	public observe() {}
	public unobserve() {}
	public disconnect() {}
};
