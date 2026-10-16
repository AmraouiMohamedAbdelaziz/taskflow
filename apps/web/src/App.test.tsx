import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { App } from './App';
it('renders the accessible foundation shell with an honest project status', () => {
  render(<App />);
  expect(screen.getByRole('main')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('A clear space');
  expect(screen.getByText(/Task management arrives/)).toBeVisible();
});
