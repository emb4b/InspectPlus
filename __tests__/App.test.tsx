import React from 'react';
import renderer, { act } from 'react-test-renderer';
import App from '../App';

describe('App', () => {
  it('renders correctly', () => {
    let tree;

    act(() => {
      tree = renderer.create(<App />);
    });

    expect(tree).toBeTruthy();
  });
});