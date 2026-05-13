import type { CommandsLocaleText } from './types';

export const defaultLocaleText: CommandsLocaleText = {
	searchInputLabel: 'Search commands',
	searchPlaceholder: 'Search commands...',
	dialogTitle: 'Command palette',
	dialogDescription: 'Search and run commands',
	loading: 'Loading...',
	commandListLabel: 'Suggestions',
	noResults: 'No results found.',
	recentlyUsed: 'Recently Used',
	selectionContext: 'Selection context',
	routeResolutionFailed: 'Route resolution failed',
	searchResolutionFailed: 'Search resolution failed',
	routeResolutionFailedPlaceholder: 'Route resolution failed. Backspace to cancel.',
	selectParamLabel: name => `Select ${ name }`,
	selectParamPlaceholder: name => `Select ${ name }. Backspace to cancel.`,
	chooseParam: name => `Choose ${ name }`,
	noOptionsAvailable: name => `No options available for ${ name }.`,
	noMatchingOptions: 'No matching options.',
	resultCount: ( count, itemType ) => `${ count } ${ itemType }${ count === 1 ? '' : 's' } found.`,
	noResultsCount: itemType => `No ${ itemType }s found.`,
};

export function mergeLocaleText(
	localeText: Partial< CommandsLocaleText > | undefined
): CommandsLocaleText {
	return { ...defaultLocaleText, ...localeText };
}
