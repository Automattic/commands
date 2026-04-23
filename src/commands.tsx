import { useEffect } from 'react';

import { validateCommands } from './validate-commands';

import type { CommandsProps } from './types';

function Commands( props: CommandsProps ) {
	const { commands } = props;

	useEffect( () => {
		validateCommands( commands );
	}, [ commands ] );

	return <div>Work in progress...</div>;
}

export { Commands };
