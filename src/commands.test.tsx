import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Commands } from './commands';

describe( 'Commands', () => {
	it( 'renders without crashing', () => {
		render( <Commands commands={ [ { id: 'test', title: 'Test', route: '/test' } ] } /> );

		expect( screen.getByText( 'Work in progress...' ) ).toBeInTheDocument();
	} );
} );
