import type { ComponentProps } from 'react';

import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareDropdown } from '@/components/ui/ThemeAwareDropdown';
import { ThemeAwareHeading } from '@/components/ui/ThemeAwareText';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';

type SelectedRelationshipNoticeProps = {
  dropdown?: ComponentProps<typeof ThemeAwareDropdown>;
  heading: string;
};

export function SelectedRelationshipNotice({
  dropdown,
  heading,
}: SelectedRelationshipNoticeProps) {
  return (
    <ThemeAwareCardSurface
      backgroundImage={CARD_ARTWORK.relationships}
      borderRadius="$sm"
      p="$3"
      style={{ elevation: 2, zIndex: 2 }}
    >
      <VStack space="xs">
        <ThemeAwareHeading>{heading}</ThemeAwareHeading>
        {dropdown ? <ThemeAwareDropdown {...dropdown} /> : null}
      </VStack>
    </ThemeAwareCardSurface>
  );
}
