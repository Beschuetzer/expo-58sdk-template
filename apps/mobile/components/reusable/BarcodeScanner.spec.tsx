import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { BarcodeScanner } from './BarcodeScanner';

jest.mock('expo-camera', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    CameraView: jest.fn((props: Record<string, unknown>) =>
      React.createElement('CameraViewHost', props),
    ),
    useCameraPermissions: jest.fn(),
  };
});

jest.mock('@/components/ui/ThemeAwareText', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    ThemeAwareText: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement('ThemeAwareTextHost', props, children),
  };
});

jest.mock('@/components/ui/useThemeAwareColors', () => ({
  useThemeAwareColors: () => ({
    colorScheme: 'light',
    getTextColor: () => '#ffffff',
  }),
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const cameraModule = jest.requireMock('expo-camera') as {
  CameraView: jest.Mock;
  useCameraPermissions: jest.Mock;
};
const mockRequestPermission = jest.fn();

describe('BarcodeScanner', () => {
  beforeEach(() => {
    cameraModule.CameraView.mockClear();
    mockRequestPermission.mockReset().mockResolvedValue({ granted: true });
    cameraModule.useCameraPermissions.mockReturnValue([
      { canAskAgain: true, granted: true },
      mockRequestPermission,
    ]);
  });

  it('configures CameraView and reports a barcode scan once', () => {
    const onScanned = jest.fn();
    const scanResult = {
      bounds: {
        origin: { x: 0, y: 0 },
        size: { height: 1, width: 1 },
      },
      cornerPoints: [],
      data: 'relationship-share-code',
      type: 'qr',
    };
    const tree = renderer.create(
      <BarcodeScanner barCodeTypes={['qr']} onScanned={onScanned} />,
    );
    const camera = tree.root.find(
      (instance) => String(instance.type) === 'CameraViewHost',
    );
    const cameraProps = camera.props as {
      barcodeScannerSettings?: { barcodeTypes: string[] };
      onBarcodeScanned?: (result: typeof scanResult) => void;
    };

    expect(cameraProps.barcodeScannerSettings).toEqual({
      barcodeTypes: ['qr'],
    });
    expect(cameraProps.onBarcodeScanned).toEqual(expect.any(Function));

    act(() => {
      cameraProps.onBarcodeScanned?.(scanResult);
      cameraProps.onBarcodeScanned?.(scanResult);
    });

    expect(onScanned).toHaveBeenCalledWith(scanResult);
    expect(onScanned).toHaveBeenCalledTimes(1);
    expect(
      tree.root.findAll(
        (instance) => String(instance.type) === 'CameraViewHost',
      ),
    ).toHaveLength(0);
    act(() => tree.unmount());
  });

  it('requests camera access on mount when permission is denied and auto-request is enabled', async () => {
    mockRequestPermission.mockResolvedValue({ granted: false });
    cameraModule.useCameraPermissions.mockReturnValue([
      { canAskAgain: true, granted: false },
      mockRequestPermission,
    ]);

    let tree: ReturnType<typeof renderer.create>;
    await act(async () => {
      tree = renderer.create(<BarcodeScanner onScanned={jest.fn()} />);
      await Promise.resolve();
    });

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(
      tree!.root.findAll(
        (instance) => String(instance.type) === 'CameraViewHost',
      ),
    ).toHaveLength(0);
    act(() => tree!.unmount());
  });

  it('notifies the caller when a manual permission request is denied', async () => {
    const onPermissionDenied = jest.fn();
    mockRequestPermission.mockResolvedValue({ granted: false });
    cameraModule.useCameraPermissions.mockReturnValue([
      { canAskAgain: true, granted: false },
      mockRequestPermission,
    ]);

    let tree: ReturnType<typeof renderer.create>;
    act(() => {
      tree = renderer.create(
        <BarcodeScanner
          autoRequestPermission={false}
          onScanned={jest.fn()}
          onPermissionDenied={onPermissionDenied}
        />,
      );
    });
    const requestButton = tree!.root.find(
      (instance) =>
        instance.props.accessibilityRole === 'button' &&
        typeof instance.props.onPress === 'function',
    );

    await act(async () => {
      await requestButton.props.onPress();
    });

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(onPermissionDenied).toHaveBeenCalledTimes(1);
    act(() => tree!.unmount());
  });

  it('does not show a permission action when permission cannot be requested again', () => {
    cameraModule.useCameraPermissions.mockReturnValue([
      { canAskAgain: false, granted: false },
      mockRequestPermission,
    ]);

    let tree: ReturnType<typeof renderer.create>;
    act(() => {
      tree = renderer.create(
        <BarcodeScanner autoRequestPermission={false} onScanned={jest.fn()} />,
      );
    });

    expect(
      tree!.root.findAll(
        (instance) =>
          instance.props.accessibilityRole === 'button' &&
          typeof instance.props.onPress === 'function',
      ),
    ).toHaveLength(0);
    act(() => tree!.unmount());
  });
});
