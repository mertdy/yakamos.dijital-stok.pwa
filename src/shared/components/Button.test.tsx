import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';


describe('Button Component', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click Me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    // Default variant is primary
    expect(button.className).toContain('bg-primary text-white');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);
    const button = screen.getByRole('button', { name: /clickable/i });
    
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger click when disabled', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });
    
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders loading state and disables button', () => {
    const handleClick = vi.fn();
    render(<Button isLoading onClick={handleClick}>Loading</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toBeDisabled();
    // SVG spinner should be present
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Button className="custom-class-123">Test</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('custom-class-123');
  });

  it('renders left and right icons', () => {
    render(
      <Button 
        leftIcon={<span data-testid="left-icon">L</span>} 
        rightIcon={<span data-testid="right-icon">R</span>}
      >
        With Icons
      </Button>
    );
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });
});
