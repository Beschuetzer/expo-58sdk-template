import type { ComponentProps, ReactNode } from 'react';

import { resolveLegacySpacing, type LegacyStyleValue } from './legacyStyle';

import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareButtonPaletteProvider } from '@/components/ui/ThemeAwareButtonPalette';
import { ThemeAwareHeading } from '@/components/ui/ThemeAwareText';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@/components/ui/modal';

export type ThemedModalButton = {
  action?: 'primary' | 'secondary' | 'positive' | 'negative' | 'default';
  isEnabled?: boolean;
  isVisible?: boolean;
  onPress?: () => void;
  text: ReactNode;
};

export type ThemedModalProps = {
  children: ReactNode;
  closeOnOverlayClick?: boolean;
  confirmButton?: ThemedModalButton;
  cancelButton?: ThemedModalButton;
  isVisible: boolean;
  onClose?: () => void;
  scrollable?: boolean;
  title?: ReactNode;
  modalProps?: Omit<ComponentProps<typeof Modal>, 'children' | 'isOpen'>;
  contentProps?: Omit<
    ComponentProps<typeof ModalContent>,
    'maxHeight' | 'width'
  > & {
    maxHeight?: LegacyStyleValue;
    width?: LegacyStyleValue;
  };
  bodyProps?: ComponentProps<typeof ModalBody>;
};

export function ThemedModal({
  bodyProps,
  cancelButton,
  closeOnOverlayClick = true,
  confirmButton,
  contentProps,
  isVisible,
  modalProps,
  onClose,
  scrollable = true,
  title,
  children,
}: ThemedModalProps) {
  const {
    width = '90%',
    maxHeight = '90%',
    style: contentStyle,
    ...nativeContentProps
  } = contentProps ?? {};
  const hasHeader = title !== undefined && title !== null;
  const hasFooter = Boolean(
    (confirmButton?.isVisible ?? true) || (cancelButton?.isVisible ?? false),
  );

  return (
    <ThemeAwareButtonPaletteProvider>
      <Modal
        {...modalProps}
        isOpen={isVisible}
        onClose={onClose}
        closeOnOverlayClick={closeOnOverlayClick}
      >
        <ModalBackdrop style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }} />
        <ModalContent
          {...nativeContentProps}
          style={[
            {
              maxHeight: resolveLegacySpacing(maxHeight),
              width: resolveLegacySpacing(width),
            },
            contentStyle,
          ]}
        >
          {hasHeader ? (
            <ModalHeader className="justify-center items-center">
              {typeof title === 'string' ? (
                <ThemeAwareHeading size="sm" flex={1} textAlign="center">
                  {title}
                </ThemeAwareHeading>
              ) : (
                title
              )}
            </ModalHeader>
          ) : null}

          {scrollable ? (
            <ModalBody
              {...bodyProps}
              keyboardShouldPersistTaps={
                bodyProps?.keyboardShouldPersistTaps ?? 'handled'
              }
              showsVerticalScrollIndicator={
                bodyProps?.showsVerticalScrollIndicator ?? true
              }
            >
              {children}
            </ModalBody>
          ) : (
            <Box className="shrink-[1px]">{children}</Box>
          )}

          {hasFooter ? (
            <ModalFooter>
              <HStack
                space="sm"
                className="justify-center items-center w-[100%]"
              >
                {cancelButton?.isVisible !== false ? (
                  cancelButton ? (
                    <ThemeAwareButton
                      action={cancelButton.action ?? 'negative'}
                      isDisabled={cancelButton.isEnabled === false}
                      onPress={cancelButton.onPress ?? onClose}
                    >
                      {cancelButton.text}
                    </ThemeAwareButton>
                  ) : null
                ) : null}
                {confirmButton?.isVisible !== false ? (
                  confirmButton ? (
                    <ThemeAwareButton
                      action={confirmButton.action ?? 'positive'}
                      isDisabled={confirmButton.isEnabled === false}
                      onPress={confirmButton.onPress}
                    >
                      {confirmButton.text}
                    </ThemeAwareButton>
                  ) : null
                ) : null}
              </HStack>
            </ModalFooter>
          ) : null}
        </ModalContent>
      </Modal>
    </ThemeAwareButtonPaletteProvider>
  );
}
