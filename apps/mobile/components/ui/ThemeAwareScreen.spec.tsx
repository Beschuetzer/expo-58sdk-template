import { HeaderHeightContext } from '@react-navigation/elements';
import React, { type ReactNode } from 'react';
import renderer, { act } from 'react-test-renderer';

import { ThemeAwareScreen } from './ThemeAwareScreen';

import { SCREEN_BACKGROUND_ARTWORK } from '@/constants/screenBackgroundArtwork';
import type {
  ScreenBackgroundColor,
  ScreenBackgroundOption,
} from '@/utils/screenBackground';

let mockColorScheme: 'light' | 'dark' = 'light';
let mockPlatformOS: 'ios' | 'android' = 'ios';
let mockScreenBackground: {
  screenBackground: ScreenBackgroundOption;
  screenBackgroundColor: ScreenBackgroundColor;
  customScreenBackgroundColor: string;
  setScreenBackground: jest.Mock;
  setScreenBackgroundColor: jest.Mock;
} = {
  screenBackground: 'none',
  screenBackgroundColor: 'cream',
  customScreenBackgroundColor: '#F6F0E5',
  setScreenBackground: jest.fn(),
  setScreenBackgroundColor: jest.fn(),
};

jest.mock('@/utils/screenBackground', () => ({
  ...jest.requireActual('@/utils/screenBackground'),
  useScreenBackground: () => mockScreenBackground,
}));

jest.mock('@react-navigation/elements', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    HeaderHeightContext: React.createContext<number | undefined>(undefined),
  };
});

jest.mock('@/components/ui/hstack', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const createComponent =
    (name: string) =>
    ({
      children,
      ...props
    }: Record<string, unknown> & { children?: ReactNode }) =>
      React.createElement(name, props, children);

  return {
    HStack: createComponent('HStack'),
  };
});

jest.mock('@/components/ui/vstack', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const createComponent =
    (name: string) =>
    ({
      children,
      ...props
    }: Record<string, unknown> & { children?: ReactNode }) =>
      React.createElement(name, props, children);

  return {
    VStack: createComponent('VStack'),
  };
});

jest.mock('react-native', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const mockScrollTo = jest.fn();
  const ScrollView = React.forwardRef<
    { scrollTo: jest.Mock },
    Record<string, unknown> & { children?: ReactNode }
  >(({ children, ...props }, ref) => {
    React.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
    return React.createElement('ScrollView', props, children as ReactNode);
  });
  const KeyboardAvoidingView = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: ReactNode }) =>
    React.createElement('KeyboardAvoidingView', props, children);
  const ImageBackground = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: ReactNode }) =>
    React.createElement('ImageBackground', props, children);
  const View = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: ReactNode }) =>
    React.createElement('View', props, children);

  return {
    Dimensions: { get: () => ({ width: 375, height: 812 }) },
    ImageBackground,
    KeyboardAvoidingView,
    Platform: {
      get OS() {
        return mockPlatformOS;
      },
    },
    ScrollView,
    View,
    __mockScrollTo: mockScrollTo,
  };
});

jest.mock('@shopify/flash-list', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const mockScrollToOffset = jest.fn();
  const FlashList = React.forwardRef<
    { scrollToOffset: jest.Mock },
    Record<string, unknown>
  >((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      scrollToOffset: mockScrollToOffset,
    }));
    const header = props.ListHeaderComponent;
    const renderedHeader =
      typeof header === 'function'
        ? React.createElement(header as React.ComponentType)
        : (header as ReactNode);
    return React.createElement('FlashList', props, renderedHeader);
  });

  return { FlashList, __mockScrollToOffset: mockScrollToOffset };
});

jest.mock('./ThemeAwareButton', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareButton: ({
      children,
      ...props
    }: {
      children?: ReactNode;
    } & Record<string, unknown>) =>
      React.createElement('ThemeAwareButtonHost', props, children),
  };
});

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => mockColorScheme,
}));

jest.mock('./ThemeAwareSurface', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareSurface: ({
      children,
      ...props
    }: {
      children?: ReactNode;
      [key: string]: unknown;
    }) => React.createElement('ThemeAwareSurface', props, children),
  };
});

const { __mockScrollTo } = jest.requireMock('react-native') as {
  __mockScrollTo: jest.Mock;
};
const { __mockScrollToOffset } = jest.requireMock('@shopify/flash-list') as {
  __mockScrollToOffset: jest.Mock;
};

function flattenStyle(style: unknown): Record<string, unknown> {
  const styles = Array.isArray(style) ? style : [style];
  return styles.reduce<Record<string, unknown>>((result, value) => {
    if (value !== null && typeof value === 'object') {
      Object.assign(result, value);
    }
    return result;
  }, {});
}

describe('ThemeAwareScreen', () => {
  afterEach(() => {
    mockColorScheme = 'light';
    mockPlatformOS = 'ios';
    mockScreenBackground = {
      screenBackground: 'none',
      screenBackgroundColor: 'cream',
      customScreenBackgroundColor: '#F6F0E5',
      setScreenBackground: jest.fn(),
      setScreenBackgroundColor: jest.fn(),
    };
  });

  it('uses the selected background image behind transparent screen content', () => {
    mockScreenBackground.screenBackground = 'futuristic';
    const tree = renderer.create(
      <ThemeAwareScreen>
        <BodyHost />
      </ThemeAwareScreen>,
    );
    const imageBackground = tree.root.find(
      (instance) => String(instance.type) === 'ImageBackground',
    );
    const overlay = tree.root.find(
      (instance) => String(instance.type) === 'View',
    );

    expect(imageBackground.props.source).toBe(
      SCREEN_BACKGROUND_ARTWORK.futuristic,
    );
    expect(flattenStyle(overlay.props.style).backgroundColor).toBe(
      'rgba(255,255,255,0.45)',
    );
    expect(
      tree.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareSurface' &&
          instance.props.lightBackground === 'transparent',
      ).length,
    ).toBeGreaterThan(0);

    act(() => tree.unmount());
  });

  it('uses the chosen color with the active theme palette', () => {
    mockScreenBackground.screenBackground = 'color';
    mockScreenBackground.screenBackgroundColor = 'sage';
    const tree = renderer.create(
      <ThemeAwareScreen>
        <BodyHost />
      </ThemeAwareScreen>,
    );
    const imageBackground = tree.root.find(
      (instance) => String(instance.type) === 'ImageBackground',
    );

    expect(imageBackground.props.source).toBeUndefined();
    expect(flattenStyle(imageBackground.props.style).backgroundColor).toBe(
      '#E5ECDF',
    );

    act(() => tree.unmount());
  });

  it('uses a custom color selected with the background color picker', () => {
    mockScreenBackground.screenBackground = 'color';
    mockScreenBackground.screenBackgroundColor = 'custom';
    mockScreenBackground.customScreenBackgroundColor = '#123456';
    const tree = renderer.create(
      <ThemeAwareScreen>
        <BodyHost />
      </ThemeAwareScreen>,
    );
    const imageBackground = tree.root.find(
      (instance) => String(instance.type) === 'ImageBackground',
    );

    expect(flattenStyle(imageBackground.props.style).backgroundColor).toBe(
      '#123456',
    );

    act(() => tree.unmount());
  });

  it('uses the navigation header height for iOS keyboard avoidance', () => {
    const tree = renderer.create(
      <HeaderHeightContext.Provider value={64}>
        <ThemeAwareScreen>
          <BodyHost />
        </ThemeAwareScreen>
      </HeaderHeightContext.Provider>,
    );
    const keyboardAvoidingView = tree.root.find(
      (instance) => String(instance.type) === 'KeyboardAvoidingView',
    );

    expect(keyboardAvoidingView.props.behavior).toBe('padding');
    expect(keyboardAvoidingView.props.keyboardVerticalOffset).toBe(64);

    act(() => tree.unmount());
  });

  it('uses height keyboard avoidance on Android without a navigation header', () => {
    mockPlatformOS = 'android';
    const tree = renderer.create(
      <ThemeAwareScreen>
        <BodyHost />
      </ThemeAwareScreen>,
    );
    const keyboardAvoidingView = tree.root.find(
      (instance) => String(instance.type) === 'KeyboardAvoidingView',
    );

    expect(keyboardAvoidingView.props.behavior).toBe('height');
    expect(keyboardAvoidingView.props.keyboardVerticalOffset).toBe(0);

    act(() => tree.unmount());
  });

  it('fills the available scroll space when requested', () => {
    const contentContainerStyle = { paddingBottom: 12 };
    const tree = renderer.create(
      <ThemeAwareScreen
        contentContainerStyle={contentContainerStyle}
        fillAvailableSpace
      >
        <BodyHost />
      </ThemeAwareScreen>,
    );
    const scrollView = tree.root.find(
      (instance) => String(instance.type) === 'ScrollView',
    );
    const contentSurface = scrollView.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareSurface' &&
        flattenStyle(instance.props.style).flexGrow === 1,
    );
    const contentStack = scrollView.find(
      (instance) =>
        String(instance.type) === 'VStack' &&
        instance.findAll((child) => String(child.type) === 'BodyHost').length >
          0,
    );

    expect(scrollView.props.contentContainerStyle).toEqual([
      contentContainerStyle,
      { flexGrow: 1 },
    ]);
    expect(flattenStyle(contentStack.props.style).flexGrow).toBe(1);
    expect(flattenStyle(contentSurface.props.style).flexGrow).toBe(1);

    act(() => tree.unmount());
  });

  it('does not show a back-to-top button by default', () => {
    const tree = renderer.create(
      <ThemeAwareScreen>
        <BodyHost />
      </ThemeAwareScreen>,
    );

    expect(
      tree.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareButtonHost',
      ),
    ).toHaveLength(0);

    act(() => tree.unmount());
  });

  it('sticks fixed header content after it scrolls with regular content', () => {
    const tree = renderer.create(
      <ThemeAwareScreen fixedHeaderContent={<HeaderHost />}>
        <BodyHost />
      </ThemeAwareScreen>,
    );
    const scrollView = tree.root.find(
      (instance) => String(instance.type) === 'ScrollView',
    );

    expect(
      tree.root.findAll((instance) => String(instance.type) === 'HeaderHost'),
    ).toHaveLength(1);
    expect(
      scrollView.findAll((instance) => String(instance.type) === 'HeaderHost'),
    ).toHaveLength(1);
    expect(
      scrollView.findAll((instance) => String(instance.type) === 'BodyHost'),
    ).toHaveLength(1);
    const headerSurface = scrollView.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareSurface' &&
        instance.props.borderBottomWidth === '$1' &&
        instance.findAll((child) => String(child.type) === 'HeaderHost')
          .length > 0,
    );
    const scrollArea = tree.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareSurface' &&
        instance.props.flex === 1 &&
        typeof instance.props.onLayout === 'function',
    );

    expect(headerSurface.props.borderColor).toBe('#ccc');
    expect(
      flattenStyle(
        headerSurface.find((instance) => String(instance.type) === 'VStack')
          .props.style,
      ),
    ).toEqual(
      expect.objectContaining({ paddingHorizontal: 24, paddingVertical: 8 }),
    );

    act(() => {
      scrollArea.props.onLayout({
        nativeEvent: { layout: { height: 600, y: 0 } },
      });
      headerSurface.props.onLayout({
        nativeEvent: { layout: { height: 40, y: 0 } },
      });
      scrollView.props.onScroll({
        nativeEvent: { contentOffset: { y: 40 } },
      });
    });

    expect(
      scrollView.findAll((instance) => String(instance.type) === 'HeaderHost'),
    ).toHaveLength(1);
    expect(
      tree.root.findAll((instance) => String(instance.type) === 'HeaderHost'),
    ).toHaveLength(2);
    const stickyHeaderScrollView = tree.root.find(
      (instance) =>
        String(instance.type) === 'ScrollView' &&
        instance.props.nestedScrollEnabled === true,
    );
    expect(stickyHeaderScrollView.props.keyboardShouldPersistTaps).toBe(
      'always',
    );
    expect(stickyHeaderScrollView.props.style.maxHeight).toBe(600);

    act(() => tree.unmount());
  });

  it('sticks fixed header content after it scrolls with FlashList content', () => {
    const tree = renderer.create(
      <ThemeAwareScreen<number>
        fixedHeaderContent={<HeaderHost />}
        flashListProps={{ data: [1], renderItem: () => null }}
      >
        <BodyHost />
      </ThemeAwareScreen>,
    );
    const flashList = tree.root.find(
      (instance) => String(instance.type) === 'FlashList',
    );

    expect(
      flashList.findAll((instance) => String(instance.type) === 'HeaderHost'),
    ).toHaveLength(1);
    expect(
      flashList.findAll((instance) => String(instance.type) === 'BodyHost'),
    ).toHaveLength(1);
    expect(
      tree.root.findAll((instance) => String(instance.type) === 'ScrollView'),
    ).toHaveLength(0);

    const headerSurface = tree.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareSurface' &&
        instance.props.borderBottomWidth === '$1' &&
        typeof instance.props.onLayout === 'function' &&
        instance.findAll((child) => String(child.type) === 'HeaderHost')
          .length > 0,
    );
    const scrollArea = tree.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareSurface' &&
        instance.props.flex === 1 &&
        typeof instance.props.onLayout === 'function',
    );

    act(() => {
      scrollArea.props.onLayout({
        nativeEvent: { layout: { height: 600, y: 0 } },
      });
      headerSurface.props.onLayout({
        nativeEvent: { layout: { height: 40, y: 0 } },
      });
      flashList.props.onScroll({
        nativeEvent: { contentOffset: { y: 40 } },
      });
    });

    expect(
      flashList.findAll((instance) => String(instance.type) === 'HeaderHost'),
    ).toHaveLength(1);
    expect(
      tree.root.findAll((instance) => String(instance.type) === 'HeaderHost'),
    ).toHaveLength(2);
    const stickyHeaderScrollView = tree.root.find(
      (instance) =>
        String(instance.type) === 'ScrollView' &&
        instance.props.nestedScrollEnabled === true,
    );
    expect(stickyHeaderScrollView.props.style.maxHeight).toBe(600);

    act(() => tree.unmount());
  });

  it('keeps regular content inside the scroll view when there is no fixed header', () => {
    const tree = renderer.create(
      <ThemeAwareScreen>
        <BodyHost />
      </ThemeAwareScreen>,
    );
    const scrollView = tree.root.find(
      (instance) => String(instance.type) === 'ScrollView',
    );

    expect(
      scrollView.findAll((instance) => String(instance.type) === 'BodyHost'),
    ).toHaveLength(1);
    expect(
      scrollView
        .findAll((instance) => String(instance.type) === 'VStack')
        .every(({ props }) => {
          const style = flattenStyle(props.style);
          return style.paddingHorizontal === 24 && style.paddingVertical === 8;
        }),
    ).toBe(true);
  });

  it('sticks the default back-to-top button and scrolls the FlashList to the top', () => {
    __mockScrollToOffset.mockClear();
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <ThemeAwareScreen<number>
          backToTop
          flashListProps={{ data: [1], renderItem: () => null }}
        >
          <BodyHost />
        </ThemeAwareScreen>,
      );
    });

    const getBackToTopButtons = () =>
      tree!.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareButtonHost',
      );
    const headerSurface = tree!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareSurface' &&
        instance.props.borderBottomWidth === '$1' &&
        typeof instance.props.onLayout === 'function',
    );
    const flashList = tree!.root.find(
      (instance) => String(instance.type) === 'FlashList',
    );

    expect(getBackToTopButtons()).toHaveLength(1);
    expect(getBackToTopButtons()[0].props.accessibilityLabel).toBe(
      'common.backToTop',
    );

    act(() => {
      headerSurface.props.onLayout({
        nativeEvent: { layout: { height: 40, y: 0 } },
      });
      flashList.props.onScroll({
        nativeEvent: { contentOffset: { y: 40 } },
      });
    });

    expect(getBackToTopButtons()).toHaveLength(2);
    act(() => getBackToTopButtons()[1].props.onPress());
    expect(__mockScrollToOffset).toHaveBeenCalledWith({
      animated: true,
      offset: 0,
    });

    act(() => {
      flashList.props.onScroll({
        nativeEvent: { contentOffset: { y: 0 } },
      });
    });
    expect(getBackToTopButtons()).toHaveLength(1);

    act(() => tree!.unmount());
  });

  it('keeps the default back-to-top button above fixed FlashList content', () => {
    __mockScrollToOffset.mockClear();
    const tree = renderer.create(
      <ThemeAwareScreen<number>
        backToTop
        fixedHeader
        flashListProps={{ data: [1], renderItem: () => null }}
      >
        <FilterHost />
      </ThemeAwareScreen>,
    );
    const order = tree.root
      .findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' ||
          String(instance.type) === 'FilterHost',
      )
      .map((instance) => String(instance.type));
    const flashList = tree.root.find(
      (instance) => String(instance.type) === 'FlashList',
    );

    expect(order).toEqual(['ThemeAwareButtonHost', 'FilterHost']);
    expect(
      flashList.findAll(
        (instance) => String(instance.type) === 'ThemeAwareButtonHost',
      ),
    ).toHaveLength(0);

    act(() => {
      tree.root
        .find((instance) => String(instance.type) === 'ThemeAwareButtonHost')
        .props.onPress();
    });
    expect(__mockScrollToOffset).toHaveBeenCalledWith({
      animated: true,
      offset: 0,
    });

    act(() => tree.unmount());
  });

  it('scrolls a ScrollView to the top from the default back-to-top button', () => {
    __mockScrollTo.mockClear();
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <ThemeAwareScreen backToTop>
          <BodyHost />
        </ThemeAwareScreen>,
      );
    });

    act(() => {
      tree!.root
        .find((instance) => String(instance.type) === 'ThemeAwareButtonHost')
        .props.onPress();
    });

    expect(__mockScrollTo).toHaveBeenCalledWith({
      animated: true,
      y: 0,
    });

    act(() => tree!.unmount());
  });

  it('lets a custom sticky header replace the default back-to-top header', () => {
    const stickyHeader = React.createElement('CustomStickyHeaderHost');
    const tree = renderer.create(
      <ThemeAwareScreen stickyHeader={stickyHeader}>
        <BodyHost />
      </ThemeAwareScreen>,
    );

    expect(
      tree.root.findAll(
        (instance) => String(instance.type) === 'CustomStickyHeaderHost',
      ),
    ).toHaveLength(1);
    expect(
      tree.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareButtonHost',
      ),
    ).toHaveLength(0);

    act(() => tree.unmount());
  });

  it('uses the default for padding axes that are not explicitly overridden', () => {
    const tree = renderer.create(
      <ThemeAwareScreen px="$5">
        <BodyHost />
      </ThemeAwareScreen>,
    );

    expect(
      tree.root
        .findAll((instance) => String(instance.type) === 'VStack')
        .every(({ props }) => {
          const style = flattenStyle(props.style);
          return style.paddingHorizontal === 20 && style.paddingVertical === 8;
        }),
    ).toBe(true);

    act(() => tree.unmount());
  });

  it('reserves viewport space for pinned bottom content', () => {
    const tree = renderer.create(
      <ThemeAwareScreen bottomContent={<FooterHost />}>
        <BodyHost />
      </ThemeAwareScreen>,
    );
    const bottomSurface = tree!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareSurface' &&
        instance.props.position === 'absolute' &&
        instance.props.borderTopWidth === '$1' &&
        typeof instance.props.onLayout === 'function',
    );
    const mainSurface = (height: number) =>
      tree.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareSurface' &&
          instance.props.style?.marginBottom === height,
      );

    expect(bottomSurface.props.position).toBe('absolute');
    expect(bottomSurface.props.bottom).toBe(0);
    expect(bottomSurface.props.top).toBeUndefined();
    expect(bottomSurface.props.borderTopWidth).toBe('$1');
    expect(bottomSurface.props.borderColor).toBe('#ccc');
    expect(
      flattenStyle(
        bottomSurface.find((instance) => String(instance.type) === 'VStack')
          .props.style,
      ),
    ).toEqual(
      expect.objectContaining({ paddingHorizontal: 24, paddingVertical: 8 }),
    );
    expect(mainSurface(0)).toBeDefined();

    act(() => {
      bottomSurface.props.onLayout({
        nativeEvent: { layout: { height: 120 } },
      });
    });

    expect(mainSurface(120)).toBeDefined();
    expect(
      tree.root.find((instance) => String(instance.type) === 'ScrollView').props
        .style,
    ).toEqual({ flex: 1 });
  });

  it('passes scroll actions to render-function bottom content', () => {
    const bottomContent = jest.fn(() => <FooterHost />);
    const tree = renderer.create(
      <ThemeAwareScreen bottomContent={bottomContent}>
        <BodyHost />
      </ThemeAwareScreen>,
    );

    expect(bottomContent).toHaveBeenCalledWith({
      scrollToTop: expect.any(Function),
    });
    expect(
      tree.root.find((instance) => String(instance.type) === 'FooterHost'),
    ).toBeDefined();

    act(() => tree.unmount());
  });

  it('uses a theme-specific gray for header and footer borders', () => {
    mockColorScheme = 'dark';
    const tree = renderer.create(
      <ThemeAwareScreen
        fixedHeaderContent={<HeaderHost />}
        bottomContent={<FooterHost />}
      >
        <BodyHost />
      </ThemeAwareScreen>,
    );
    const headerSurface = tree.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareSurface' &&
        instance.props.borderBottomWidth === '$1' &&
        instance.findAll((child) => String(child.type) === 'HeaderHost')
          .length > 0,
    );
    const bottomSurface = tree.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareSurface' &&
        instance.props.borderTopWidth === '$1',
    );

    expect(headerSurface.props.borderColor).toBe('#222');
    expect(bottomSurface.props.borderColor).toBe('#222');

    act(() => tree.unmount());
  });
});

function HeaderHost() {
  return React.createElement('HeaderHost');
}

function BodyHost() {
  return React.createElement('BodyHost');
}

function FilterHost() {
  return React.createElement('FilterHost');
}

function FooterHost() {
  return React.createElement('FooterHost');
}
