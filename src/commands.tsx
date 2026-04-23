import { useEffect, useState } from 'react';

import { useHotkey } from './hooks/use-hotkey';
import { validateCommands } from './validate-commands';

import type { CommandsProps } from './types';

function Commands( props: CommandsProps ) {
	const { commands, triggerKey = 'Mod+k' } = props;
	const [ isOpen, setIsOpen ] = useState( false );

	useEffect( () => {
		validateCommands( commands );
	}, [ commands ] );

	useHotkey( triggerKey, () => {
		setIsOpen( true );
	} );

	return <div data-open={ isOpen }>Work in progress...</div>;
}

export { Commands };
