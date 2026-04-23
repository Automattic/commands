import { useEffect } from 'react';

import { CommandsProps } from './types';
import { validateCommands } from './validate-commands';

function Commands( props: CommandsProps ) {
	const { commands } = props;

	useEffect( () => {
		validateCommands( commands );
	}, [ commands ] );

	return <div>Work in progress...</div>;
}

export { Commands };
