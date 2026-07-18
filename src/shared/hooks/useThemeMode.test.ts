import { beforeEach, describe, expect, it } from 'vitest';
import { initializeThemeMode } from './useThemeMode';

describe('initializeThemeMode', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  it('uses light mode by default', () => {
    expect(initializeThemeMode()).toBe('light');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('applies the locally saved dark mode preference', () => {
    localStorage.setItem('dijital-stok-theme', 'dark');

    expect(initializeThemeMode()).toBe('dark');
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
});
