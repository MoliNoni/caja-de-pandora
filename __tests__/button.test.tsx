import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '../components/button';

describe('Button', () => {
  it('fires onPress with its label as the accessible name', () => {
    const onPress = jest.fn();
    render(<Button label="Agregar" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Agregar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire while disabled or loading', () => {
    const onPress = jest.fn();
    const { rerender } = render(<Button label="Pagar" onPress={onPress} disabled />);
    fireEvent.press(screen.getByRole('button'));
    rerender(<Button label="Pagar" onPress={onPress} loading />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
