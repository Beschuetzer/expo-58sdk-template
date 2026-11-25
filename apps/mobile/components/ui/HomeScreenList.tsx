import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { FlatList, View } from 'react-native';

import { useColorScheme } from '@/components/hooks/useColorScheme';
import { HomePageItem } from '@/components/ui/HomePageItem';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { COLORS } from '@/constants/colors';
import { useI18n } from '@/utils/i18n';

const HOME_PAGE_ITEM_SPACING = 12;
const HOME_PAGE_ITEMS_VISIBLE = 2;

type ItemHeightMeasurements = {
  layoutKey: string;
  heights: Record<string, number>;
};

export type HomeScreenListItem = {
  id: string;
  props: ComponentProps<typeof HomePageItem>;
};

type HomeScreenListProps = {
  items: HomeScreenListItem[];
  title: string;
};

export function HomeScreenList({ items, title }: HomeScreenListProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const { t } = useI18n();
  const [viewportWidth, setViewportWidth] = useState(0);
  const visibleItemCount = Math.min(items.length, HOME_PAGE_ITEMS_VISIBLE);
  const hasMoreItems = items.length > HOME_PAGE_ITEMS_VISIBLE;
  const itemWidth =
    visibleItemCount === 0
      ? viewportWidth
      : Math.max(
          0,
          (viewportWidth - HOME_PAGE_ITEM_SPACING * (visibleItemCount - 1)) /
            visibleItemCount,
        );
  const itemLayoutKey = JSON.stringify([
    itemWidth,
    items.map(({ id, props }) => [
      id,
      props.title,
      Boolean(props.description),
      Boolean(props.isUrgent),
    ]),
  ]);
  const [itemHeightMeasurements, setItemHeightMeasurements] =
    useState<ItemHeightMeasurements>({ heights: {}, layoutKey: '' });
  const measuredHeights =
    itemHeightMeasurements.layoutKey === itemLayoutKey
      ? items
          .map(({ id }) => itemHeightMeasurements.heights[id])
          .filter((height): height is number => typeof height === 'number')
      : [];
  const itemHeight =
    items.length > 0 && measuredHeights.length === items.length
      ? Math.max(...measuredHeights)
      : undefined;

  const recordItemHeight = (itemId: string, height: number) => {
    setItemHeightMeasurements((current) => {
      const heights =
        current.layoutKey === itemLayoutKey ? current.heights : {};
      if (heights[itemId] === height) {
        return current;
      }

      return {
        heights: { ...heights, [itemId]: height },
        layoutKey: itemLayoutKey,
      };
    });
  };

  return (
    <VStack space="sm">
      <ThemeAwareHeading accessibilityRole="header">{title}</ThemeAwareHeading>
      <FlatList
        data={items}
        horizontal
        ItemSeparatorComponent={HomePageItemSeparator}
        keyExtractor={(item) => item.id}
        onLayout={(event) => {
          setViewportWidth(event.nativeEvent.layout.width);
        }}
        renderItem={({ item }) => (
          <View style={{ width: itemWidth }}>
            <HomePageItem
              {...item.props}
              itemHeight={itemHeight}
              onHeightMeasured={(height) => recordItemHeight(item.id, height)}
            />
          </View>
        )}
        showsHorizontalScrollIndicator={hasMoreItems}
        style={{ width: '100%' }}
      />
      {hasMoreItems ? (
        <HStack className="items-center justify-end" space="xs">
          <ThemeAwareText size="xs">{t('home.swipeForMore')}</ThemeAwareText>
          <FontAwesome
            color={COLORS[colorScheme].tint}
            name="angle-double-right"
            size={16}
          />
        </HStack>
      ) : null}
    </VStack>
  );
}

function HomePageItemSeparator() {
  return <View style={{ width: HOME_PAGE_ITEM_SPACING }} />;
}
