import { HeaderHeightContext } from '@react-navigation/elements';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import renderer from 'react-test-renderer';

import { ThemeAwareScreen } from '../components/ui/ThemeAwareScreen';

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/components/ui/ThemeAwareButton', () => ({
  ThemeAwareButton: 'ThemeAwareButtonHost',
}));

jest.mock('@/components/ui/ThemeAwareSurface', () => ({
  ThemeAwareSurface: 'ThemeAwareSurfaceHost',
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: 'VStackHost',
}));

jest.mock('@shopify/flash-list', () => ({
  FlashList: 'FlashListHost',
}));

describe('ThemeAwareScreen', () => {
  it('keeps scrollable content inside a keyboard-aware viewport', () => {
    const tree = renderer.create(
      <HeaderHeightContext.Provider value={72}>
        <ThemeAwareScreen>
          <>Form content</>
        </ThemeAwareScreen>
      </HeaderHeightContext.Provider>,
    );
    const keyboardAvoidingView = tree.root.findByType(KeyboardAvoidingView);

    expect(keyboardAvoidingView.props.behavior).toBe(
      Platform.OS === 'ios' ? 'padding' : 'height',
    );
    expect(keyboardAvoidingView.props.keyboardVerticalOffset).toBe(72);
    expect(tree.root.findAllByType(ScrollView)).toHaveLength(1);
  });
});
