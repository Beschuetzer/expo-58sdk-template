import { useCallback, useMemo } from 'react';
import { FlatList } from 'react-native';

import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemedModal } from '@/components/ui/ThemedModal';
import { HStack } from '@/components/ui/hstack';
import {
  ERRORS_INITIAL,
  errorSelector,
  setErrors,
} from '@/state/slices/generalSlice';
import { useAppDispatch, useAppSelector } from '@/state/store';
import { Error } from '@/types/errors';
import { logInfo } from '@/utils/logging';

export type ErrorModalProps = object;

export const ErrorModal = (props: ErrorModalProps) => {
  const errors = useAppSelector(errorSelector) ?? [];
  const dispatch = useAppDispatch();

  // Filter to unique errors by message using useMemo
  const uniqueErrors = useMemo(() => {
    if (!Array.isArray(errors)) {
      return [];
    }

    return errors.filter(
      (error, index, self) =>
        index === self.findIndex((e) => e.message === error.message),
    );
  }, [errors]);

  const onButtonPress = useCallback((error: Error) => {
    const errorMessage = error.message ?? error.error?.message;
    const stackTrace = error.stack ?? error.error?.stack;
    const statusCode = error.statusCode ?? undefined;

    logInfo('error_details_requested', {
      name: error.name ?? error.error?.name,
      code: error.code ?? error.error?.code,
      hasMessage: Boolean(errorMessage),
      hasStackTrace: Boolean(stackTrace),
      statusCode,
    });
  }, []);

  const onConfirmPress = useCallback(() => {
    dispatch(setErrors(ERRORS_INITIAL));
  }, [dispatch]);

  return (
    <ThemedModal
      confirmButton={{ text: 'Ok', onPress: onConfirmPress }}
      title="Errors Encountered"
      isVisible={uniqueErrors.some((error) => Boolean(error.message))}
      onClose={onConfirmPress}
      scrollable={false}
    >
      <FlatList
        data={uniqueErrors}
        keyExtractor={(item, index) => item.message ?? String(index)}
        renderItem={({ item, index }) => {
          if (!item.message) return null;
          return (
            <HStack className="justify-between items-center px-4 py-2">
              <ThemeAwareButton
                variant="link"
                onPress={() => onButtonPress(item)}
              >
                {`${index + 1}). ${item.message}`}
              </ThemeAwareButton>
            </HStack>
          );
        }}
      />
    </ThemedModal>
  );
};
