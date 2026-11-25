import { HeaderHeightContext } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import type { FlashListProps, FlashListRef } from '@shopify/flash-list';
import {
  createElement,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import type { ComponentProps, ReactNode } from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewInstance,
} from 'react-native';

import { ThemeAwareButton } from './ThemeAwareButton';
import { ThemeAwareButtonPaletteProvider } from './ThemeAwareButtonPalette';
import { ThemeAwareSurface } from './ThemeAwareSurface';
import {
  resolveLegacySpacing,
  splitLegacyStyleProps,
  type LegacyStyleProps,
} from './legacyStyle';

import { useColorScheme } from '@/components/hooks/useColorScheme';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { COLORS } from '@/constants/colors';
import { THEME_AWARE_CONTENT_HORIZONTAL_GUTTER } from '@/constants/layout';
import { SCREEN_BACKGROUND_ARTWORK } from '@/constants/screenBackgroundArtwork';
import { absolutePositioning } from '@/constants/styles';
import { useI18n } from '@/utils/i18n';
import {
  SCREEN_BACKGROUND_COLORS,
  useScreenBackground,
} from '@/utils/screenBackground';

const BOTTOM_CONTENT_POSITIONING = {
  position: 'absolute' as const,
  bottom: 0,
  left: 0,
  right: 0,
};

const LIST_OVERLAY_POSITIONING = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1,
};

const TRANSPARENT_SCREEN_SURFACE = {
  darkBackground: 'transparent',
  lightBackground: 'transparent',
};

export type ThemeAwareScreenHeaderActions = {
  scrollToTop: () => void;
};

export type ThemeAwareScreenStickyHeader =
  | ReactNode
  | ((actions: ThemeAwareScreenHeaderActions) => ReactNode);
export type ThemeAwareScreenBottomContent =
  | ReactNode
  | ((actions: ThemeAwareScreenHeaderActions) => ReactNode);

export type ThemeAwareScreenProps<ItemT> = Omit<
  ComponentProps<typeof VStack>,
  'children' | 'style'
> &
  LegacyStyleProps & {
    backToTop?: boolean;
    bottomContent?: ThemeAwareScreenBottomContent;
    children: ReactNode | ReactNode[];
    contentContainerStyle?: ComponentProps<
      typeof ScrollView
    >['contentContainerStyle'];
    fillAvailableSpace?: boolean;
    fixedHeader?: boolean;
    fixedHeaderContent?: ReactNode | ReactNode[];
    flashListProps?: FlashListProps<ItemT>;
    stickyHeader?: ThemeAwareScreenStickyHeader;
    style?: ComponentProps<typeof VStack>['style'];
  };

export function ThemeAwareScreen<ItemT = unknown>(
  props: ThemeAwareScreenProps<ItemT>,
) {
  const colorScheme = useColorScheme() ?? 'light';
  const {
    screenBackground,
    screenBackgroundColor,
    customScreenBackgroundColor,
  } = useScreenBackground();
  const screenBackgroundSource =
    screenBackground === 'none' || screenBackground === 'color'
      ? undefined
      : SCREEN_BACKGROUND_ARTWORK[screenBackground];
  const screenBackgroundColorValue =
    screenBackground === 'color'
      ? screenBackgroundColor === 'custom'
        ? customScreenBackgroundColor
        : SCREEN_BACKGROUND_COLORS[screenBackgroundColor][colorScheme]
      : COLORS[colorScheme].background;
  const keyboardVerticalOffset = useContext(HeaderHeightContext) ?? 0;
  const {
    className,
    fillAvailableSpace = false,
    style: explicitStyle,
    ...styleProps
  } = props;
  const { props: screenProps, style: legacyStyle } = splitLegacyStyleProps(
    styleProps,
    colorScheme,
  );
  const {
    backToTop = false,
    bottomContent,
    children,
    contentContainerStyle,
    fixedHeader = false,
    fixedHeaderContent,
    flashListProps,
    stickyHeader,
    ...contentProps
  } = screenProps;
  const defaultPadding =
    props.p === undefined
      ? {
          paddingVertical: resolveLegacySpacing(props.py ?? '$2'),
          paddingHorizontal: resolveLegacySpacing(
            props.px ?? THEME_AWARE_CONTENT_HORIZONTAL_GUTTER,
          ),
        }
      : { padding: resolveLegacySpacing(props.p) };
  const contentStyle = [defaultPadding, legacyStyle, explicitStyle];
  const fillableContentStyle = fillAvailableSpace
    ? [...contentStyle, { flexGrow: 1 }]
    : contentStyle;
  const sectionBorderColor = COLORS[colorScheme].border;
  const [bottomContentHeight, setBottomContentHeight] = useState(0);
  const [isStickyHeaderVisible, setIsStickyHeaderVisible] = useState(false);
  const [scrollAreaHeight, setScrollAreaHeight] = useState(0);
  const flashListRef = useRef<FlashListRef<ItemT>>(null);
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const scrollOffset = useRef(0);
  const stickyHeaderEndOffset = useRef<number | null>(null);

  const scrollToTop = useCallback(() => {
    if (flashListRef.current) {
      flashListRef.current.scrollToOffset({ animated: true, offset: 0 });
      return;
    }

    scrollViewRef.current?.scrollTo({ animated: true, y: 0 });
  }, []);
  const bottomContentNode =
    typeof bottomContent === 'function'
      ? bottomContent({ scrollToTop })
      : bottomContent;
  const hasBottomContent =
    bottomContentNode !== undefined &&
    bottomContentNode !== null &&
    bottomContentNode !== false;

  const updateStickyHeaderVisibility = useCallback((offset: number) => {
    if (stickyHeaderEndOffset.current === null) {
      return;
    }

    setIsStickyHeaderVisible(offset >= stickyHeaderEndOffset.current);
  }, []);

  const handleStickyHeaderLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height, y } = event.nativeEvent.layout;
      stickyHeaderEndOffset.current = y + height;
      updateStickyHeaderVisibility(scrollOffset.current);
    },
    [updateStickyHeaderVisibility],
  );

  const handleScrollAreaLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setScrollAreaHeight((currentHeight) =>
      currentHeight === height ? currentHeight : height,
    );
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      flashListProps?.onScroll?.(event);
      scrollOffset.current = event.nativeEvent.contentOffset.y;
      updateStickyHeaderVisibility(scrollOffset.current);
    },
    [flashListProps?.onScroll, updateStickyHeaderVisibility],
  );

  const shouldUseFixedHeaderContentAsStickyHeader =
    !fixedHeader &&
    stickyHeader === undefined &&
    !backToTop &&
    fixedHeaderContent !== undefined &&
    fixedHeaderContent !== null &&
    fixedHeaderContent !== false;
  const stickyHeaderContent =
    stickyHeader !== undefined ? (
      typeof stickyHeader === 'function' ? (
        stickyHeader({ scrollToTop })
      ) : (
        stickyHeader
      )
    ) : backToTop ? (
      <DefaultBackToTopHeader scrollToTop={scrollToTop} />
    ) : shouldUseFixedHeaderContentAsStickyHeader ? (
      fixedHeaderContent
    ) : null;
  const isDefaultBackToTopHeaderPinned =
    fixedHeader && stickyHeader === undefined && backToTop;
  const hasStickyHeader =
    !isDefaultBackToTopHeaderPinned &&
    stickyHeaderContent !== undefined &&
    stickyHeaderContent !== null &&
    stickyHeaderContent !== false;
  const stickyHeaderComponent = hasStickyHeader ? (
    <ThemeAwareSurface
      borderBottomWidth="$1"
      borderColor={sectionBorderColor}
      onLayout={handleStickyHeaderLayout}
    >
      {renderSectionContent(stickyHeaderContent)}
    </ThemeAwareSurface>
  ) : null;

  function renderStickyHeaderOverlay() {
    if (!hasStickyHeader || !isStickyHeaderVisible) {
      return null;
    }

    return (
      <ThemeAwareSurface
        {...LIST_OVERLAY_POSITIONING}
        borderBottomWidth="$1"
        borderColor={sectionBorderColor}
      >
        <ScrollView
          keyboardShouldPersistTaps="always"
          nestedScrollEnabled
          style={
            scrollAreaHeight > 0 ? { maxHeight: scrollAreaHeight } : undefined
          }
        >
          {renderSectionContent(stickyHeaderContent)}
        </ScrollView>
      </ThemeAwareSurface>
    );
  }

  function renderContent(content: ReactNode | ReactNode[]) {
    return (
      <ThemeAwareSurface
        {...TRANSPARENT_SCREEN_SURFACE}
        style={fillAvailableSpace ? { flexGrow: 1 } : undefined}
      >
        <VStack
          {...contentProps}
          className={className}
          style={fillableContentStyle}
        >
          {content}
        </VStack>
      </ThemeAwareSurface>
    );
  }

  function renderSectionContent(content: ReactNode | ReactNode[]) {
    return (
      <VStack {...contentProps} className={className} style={contentStyle}>
        {content}
      </VStack>
    );
  }

  function renderListHeader(
    listHeaderComponent: FlashListProps<ItemT>['ListHeaderComponent'],
  ): ReactNode {
    if (typeof listHeaderComponent === 'function') {
      return createElement(listHeaderComponent);
    }

    return listHeaderComponent;
  }

  function renderFlashListArea(
    listProps: FlashListProps<ItemT>,
    listHeaderComponent = listProps.ListHeaderComponent,
    leadingListHeaderComponent?: ReactNode,
  ) {
    const renderedListHeader = renderListHeader(listHeaderComponent);
    const combinedListHeader: FlashListProps<ItemT>['ListHeaderComponent'] =
      leadingListHeaderComponent !== undefined || hasStickyHeader ? (
        <>
          {leadingListHeaderComponent}
          {hasStickyHeader ? stickyHeaderComponent : null}
          {renderedListHeader}
        </>
      ) : (
        listHeaderComponent
      );
    const list = (
      <FlashList
        {...listProps}
        ref={flashListRef}
        ListHeaderComponent={combinedListHeader}
        keyboardShouldPersistTaps={
          flashListProps?.keyboardShouldPersistTaps ?? 'always'
        }
        contentContainerStyle={flashListProps?.contentContainerStyle}
        onScroll={hasStickyHeader ? handleScroll : listProps.onScroll}
      />
    );

    return (
      <ThemeAwareSurface
        flex={1}
        {...TRANSPARENT_SCREEN_SURFACE}
        onLayout={hasStickyHeader ? handleScrollAreaLayout : undefined}
      >
        {list}
        {renderStickyHeaderOverlay()}
      </ThemeAwareSurface>
    );
  }

  function renderScrollView(content: ReactNode | ReactNode[]) {
    return (
      <ThemeAwareSurface
        flex={1}
        {...TRANSPARENT_SCREEN_SURFACE}
        onLayout={hasStickyHeader ? handleScrollAreaLayout : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={
            fillAvailableSpace
              ? [contentContainerStyle, { flexGrow: 1 }]
              : contentContainerStyle
          }
          onScroll={hasStickyHeader ? handleScroll : undefined}
          scrollEventThrottle={hasStickyHeader ? 16 : undefined}
        >
          {stickyHeaderComponent}
          {content}
        </ScrollView>
        {renderStickyHeaderOverlay()}
      </ThemeAwareSurface>
    );
  }

  function renderList() {
    const contentJSX = renderContent(children);
    const fixedHeaderJSX =
      fixedHeaderContent === undefined ||
      shouldUseFixedHeaderContentAsStickyHeader ? undefined : (
        <ThemeAwareSurface
          borderBottomWidth="$1"
          borderColor={sectionBorderColor}
        >
          {renderSectionContent(fixedHeaderContent)}
        </ThemeAwareSurface>
      );

    if (flashListProps) {
      if (fixedHeader) {
        return (
          <ThemeAwareSurface flex={1} {...TRANSPARENT_SCREEN_SURFACE}>
            {fixedHeaderJSX}
            <ThemeAwareSurface
              borderBottomWidth="$1"
              borderColor={sectionBorderColor}
            >
              {renderSectionContent(
                isDefaultBackToTopHeaderPinned ? (
                  <>
                    {stickyHeaderContent}
                    {children}
                  </>
                ) : (
                  children
                ),
              )}
            </ThemeAwareSurface>
            {renderFlashListArea(flashListProps)}
          </ThemeAwareSurface>
        );
      }

      if (fixedHeaderJSX) {
        return renderFlashListArea(
          flashListProps,
          flashListProps.ListHeaderComponent ?? contentJSX,
          fixedHeaderJSX,
        );
      }

      return renderFlashListArea(
        flashListProps,
        flashListProps.ListHeaderComponent ?? contentJSX,
      );
    }

    if (fixedHeaderJSX) {
      return (
        <ThemeAwareSurface flex={1} {...TRANSPARENT_SCREEN_SURFACE}>
          {renderScrollView(
            <>
              {fixedHeaderJSX}
              {contentJSX}
            </>,
          )}
        </ThemeAwareSurface>
      );
    }

    return renderScrollView(contentJSX);
  }

  return (
    <ThemeAwareButtonPaletteProvider>
      <ImageBackground
        source={screenBackgroundSource}
        resizeMode="cover"
        style={[
          absolutePositioning,
          { backgroundColor: screenBackgroundColorValue },
        ]}
      >
        {screenBackgroundSource ? (
          <View
            pointerEvents="none"
            style={[
              absolutePositioning,
              {
                backgroundColor:
                  colorScheme === 'dark'
                    ? 'rgba(0,0,0,0.45)'
                    : 'rgba(255,255,255,0.45)',
              },
            ]}
          />
        ) : null}
        <ThemeAwareSurface
          {...absolutePositioning}
          {...TRANSPARENT_SCREEN_SURFACE}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={keyboardVerticalOffset}
            style={{ flex: 1 }}
          >
            <ThemeAwareSurface flex={1} {...TRANSPARENT_SCREEN_SURFACE}>
              <ThemeAwareSurface
                flex={1}
                style={{
                  marginBottom: hasBottomContent ? bottomContentHeight : 0,
                }}
                {...TRANSPARENT_SCREEN_SURFACE}
              >
                {renderList()}
              </ThemeAwareSurface>
              {hasBottomContent ? (
                <ThemeAwareSurface
                  {...BOTTOM_CONTENT_POSITIONING}
                  borderTopWidth="$1"
                  borderColor={sectionBorderColor}
                  onLayout={(event: LayoutChangeEvent) => {
                    setBottomContentHeight(event.nativeEvent.layout.height);
                  }}
                >
                  {renderSectionContent(bottomContentNode)}
                </ThemeAwareSurface>
              ) : null}
            </ThemeAwareSurface>
          </KeyboardAvoidingView>
        </ThemeAwareSurface>
      </ImageBackground>
    </ThemeAwareButtonPaletteProvider>
  );
}

function DefaultBackToTopHeader({ scrollToTop }: { scrollToTop: () => void }) {
  const { t } = useI18n();
  const label = t('common.backToTop');

  return (
    <HStack className="justify-end">
      <ThemeAwareButton
        accessibilityLabel={label}
        onPress={scrollToTop}
        variant="outline"
      >
        {label}
      </ThemeAwareButton>
    </HStack>
  );
}
