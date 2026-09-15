import React from 'react';
import type { ScrollView } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { HeaderScrollProvider } from '../../home/context/HeaderScrollContext';
import { useMainTabChange } from './useMainTabChange';

const scrollTo = jest.fn();
const scrollRef = { current: { scrollTo } as unknown as ScrollView };

let handleChange: (key: string) => void;
let lastActive = '';

const Harness: React.FC<{ active: string }> = ({ active }) => {
  const setActive = jest.fn();
  handleChange = useMainTabChange(active, setActive, scrollRef);
  lastActive = active;
  return null;
};

const render = (active: string) => {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <HeaderScrollProvider>
        <Harness active={active} />
      </HeaderScrollProvider>,
    );
  });
  return renderer;
};

beforeEach(() => {
  scrollTo.mockClear();
});

describe('useMainTabChange', () => {
  it('scrolls the body back to the top when switching to another tab', () => {
    render('geninfo');
    act(() => handleChange('purpose'));
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
  });

  it('leaves the scroll position alone when the active tab is tapped again', () => {
    render('geninfo');
    act(() => handleChange('geninfo'));
    expect(scrollTo).not.toHaveBeenCalled();
    expect(lastActive).toBe('geninfo');
  });

  it('survives a missing scroll ref', () => {
    const detached = { current: null };
    let change!: (key: string) => void;
    const Loose: React.FC = () => {
      change = useMainTabChange('geninfo', jest.fn(), detached);
      return null;
    };
    act(() => {
      TestRenderer.create(
        <HeaderScrollProvider>
          <Loose />
        </HeaderScrollProvider>,
      );
    });
    expect(() => act(() => change('purpose'))).not.toThrow();
  });
});
