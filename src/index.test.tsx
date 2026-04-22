import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Command } from './index';

describe('Command', () => {
  it('renders without crashing', () => {
    render(
      <Command>
        <Command.Input placeholder="Search..." />
        <Command.List>
          <Command.Empty>No results</Command.Empty>
        </Command.List>
      </Command>
    );

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });
});
