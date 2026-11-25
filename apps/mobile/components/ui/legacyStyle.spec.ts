import {
  resolveLegacyColor,
  resolveLegacySpacing,
  splitLegacyStyleProps,
} from './legacyStyle';

describe('legacy style helpers', () => {
  describe('resolveLegacySpacing', () => {
    it.each([
      [undefined, undefined],
      [2, 2],
      ['$full', '100%'],
      ['$auto', 'auto'],
      ['auto', 'auto'],
      ['$md', 16],
      ['$2.5', 10],
      ['25%', '25%'],
      ['2.5', 2.5],
    ] as const)('resolves %s to %s', (value, expected) => {
      expect(resolveLegacySpacing(value)).toBe(expected);
    });

    it('rejects unsupported dimensions', () => {
      expect(() => resolveLegacySpacing('unknown')).toThrow(
        'Unsupported Gluestack dimension token: unknown',
      );
    });
  });

  describe('resolveLegacyColor', () => {
    it('preserves literals and resolves theme-aware color tokens', () => {
      expect(resolveLegacyColor(undefined, 'light')).toBeUndefined();
      expect(resolveLegacyColor('#123456', 'light')).toBe('#123456');
      expect(resolveLegacyColor('$primary500', 'light')).toBe('#1a1a1a');
      expect(resolveLegacyColor('$primary500', 'dark')).toBe('#fff');
      expect(resolveLegacyColor('$primary50', 'light')).toBe('#f5f5f5');
      expect(resolveLegacyColor('$primary50', 'dark')).toBe('#eff6ff');
      expect(resolveLegacyColor('$primary200', 'light')).toBe('#d4d4d4');
      expect(resolveLegacyColor('$primary200', 'dark')).toBe('#bfdbfe');
      expect(resolveLegacyColor('$textLight500', 'light')).toBe('#d0d0d0');
      expect(resolveLegacyColor('$textLight500', 'dark')).toBe('#c4c4c4');
      expect(resolveLegacyColor('$error600', 'dark')).toBe('#dc2626');
    });

    it('rejects unknown color tokens', () => {
      expect(() => resolveLegacyColor('$unknown', 'light')).toThrow(
        'Unsupported Gluestack color token: $unknown',
      );
    });
  });

  it('maps legacy style tokens to native styles and preserves native props', () => {
    const result = splitLegacyStyleProps(
      {
        p: '$sm',
        px: '$md',
        py: '$lg',
        pt: '$xs',
        pb: '$xl',
        pl: '$2',
        pr: '20%',
        m: '$sm',
        mx: '$md',
        my: '$lg',
        mt: '$xs',
        mb: '$xl',
        ml: '$2',
        mr: '20%',
        width: '50%',
        height: 100,
        minWidth: 2,
        minHeight: '$2',
        maxWidth: 'auto',
        maxHeight: '$full',
        w: '$3',
        h: '4',
        bg: '$backgroundDark800',
        backgroundColor: '$white',
        color: '$textLight500',
        borderColor: '$error600',
        borderTopColor: '$warning100',
        borderRightColor: '$success600',
        borderBottomColor: '$primary200',
        borderLeftColor: '$textDark50',
        borderWidth: 1.5,
        borderTopWidth: '$2',
        borderRightWidth: '1',
        borderBottomWidth: 0,
        borderLeftWidth: '$0.5',
        borderRadius: '$md',
        borderTopLeftRadius: '$xs',
        borderTopRightRadius: '$sm',
        borderBottomLeftRadius: '$lg',
        borderBottomRightRadius: '$full',
        borderStyle: 'dashed',
        fontFamily: 'Inter',
        fontSize: '$xl',
        fontWeight: '$bold',
        lineHeight: '$4',
        letterSpacing: 0.5,
        textAlign: 'center',
        textDecorationLine: 'underline',
        textTransform: 'uppercase',
        flex: 1,
        flexGrow: 2,
        flexShrink: 0,
        flexWrap: 'wrap',
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'stretch',
        justifyContent: 'space-between',
        position: 'absolute',
        top: '$2',
        right: 'auto',
        bottom: '50%',
        left: 1,
        zIndex: 2,
        opacity: 0.5,
        overflow: 'hidden',
        display: 'flex',
        elevation: 3,
        shadowColor: '$black',
        shadowOffset: { height: 2, width: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        gap: '$sm',
        rowGap: '1.5',
        columnGap: '50%',
        accessibilityLabel: 'native label',
        testID: 'native-test',
      },
      'dark',
    );

    expect(result.props).toEqual({
      accessibilityLabel: 'native label',
      testID: 'native-test',
    });
    expect(result.style).toMatchObject({
      padding: 8,
      paddingHorizontal: 16,
      paddingVertical: 24,
      paddingTop: 4,
      paddingBottom: 32,
      paddingLeft: 8,
      paddingRight: '20%',
      margin: 8,
      marginHorizontal: 16,
      marginVertical: 24,
      marginTop: 4,
      marginBottom: 32,
      marginLeft: 8,
      marginRight: '20%',
      width: 12,
      height: 4,
      minWidth: 2,
      minHeight: 8,
      maxWidth: 'auto',
      maxHeight: '100%',
      backgroundColor: '#262626',
      color: '#c4c4c4',
      borderColor: '#dc2626',
      borderTopColor: '#fef3c7',
      borderRightColor: '#16a34a',
      borderBottomColor: '#bfdbfe',
      borderLeftColor: '#fff',
      borderWidth: 1.5,
      borderTopWidth: 2,
      borderRightWidth: 1,
      borderBottomWidth: 0,
      borderLeftWidth: 0.5,
      borderRadius: 6,
      borderTopLeftRadius: 2,
      borderTopRightRadius: 4,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: '100%',
      borderStyle: 'dashed',
      fontFamily: 'Inter',
      fontSize: 20,
      fontWeight: 'bold',
      lineHeight: 16,
      letterSpacing: 0.5,
      textAlign: 'center',
      textDecorationLine: 'underline',
      textTransform: 'uppercase',
      flex: 1,
      flexGrow: 2,
      flexShrink: 0,
      flexWrap: 'wrap',
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'stretch',
      justifyContent: 'space-between',
      position: 'absolute',
      top: 8,
      right: 'auto',
      bottom: '50%',
      left: 1,
      zIndex: 2,
      opacity: 0.5,
      overflow: 'hidden',
      display: 'flex',
      elevation: 3,
      shadowColor: '#000000',
      shadowOffset: { height: 2, width: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      gap: 8,
      rowGap: 1.5,
      columnGap: '50%',
    });
  });

  it('uses padding, margin, dimensions, and radius fallbacks', () => {
    const result = splitLegacyStyleProps(
      {
        padding: '$md',
        paddingHorizontal: '$lg',
        paddingVertical: '$xs',
        margin: '$md',
        marginHorizontal: '$lg',
        marginVertical: '$xs',
        width: '75%',
        height: '80%',
        borderRadius: '$lg',
        backgroundColor: '$white',
        fontSize: '$full',
        accessibilityLabel: 'kept',
      },
      'light',
    );

    expect(result.props).toEqual({ accessibilityLabel: 'kept' });
    expect(result.style).toMatchObject({
      padding: 16,
      paddingHorizontal: 24,
      paddingVertical: 4,
      paddingTop: 16,
      paddingBottom: 16,
      paddingLeft: 24,
      paddingRight: 24,
      margin: 16,
      marginHorizontal: 24,
      marginVertical: 4,
      marginTop: 16,
      marginBottom: 16,
      marginLeft: 24,
      marginRight: 24,
      width: '75%',
      height: '80%',
      backgroundColor: '#ffffff',
      borderRadius: 8,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
    });
    expect(result.style.fontSize).toBeUndefined();
  });

  it('omits undefined legacy styles and rejects unsupported style tokens', () => {
    const nativeOnlyProps = { p: undefined, testID: 'native-only' };
    const nativeOnly = splitLegacyStyleProps(nativeOnlyProps, 'light');
    expect(nativeOnly.props).toEqual({ testID: 'native-only' });
    expect(nativeOnly.style).toEqual({});

    expect(() =>
      splitLegacyStyleProps({ borderWidth: 'hairline' }, 'light'),
    ).toThrow('Unsupported Gluestack border width token: hairline');
    expect(() =>
      splitLegacyStyleProps({ borderRadius: '$unknown' }, 'light'),
    ).toThrow('Unsupported Gluestack dimension token: $unknown');
    expect(() =>
      splitLegacyStyleProps({ fontWeight: '$unknown' }, 'light'),
    ).toThrow('Unsupported Gluestack font weight token: $unknown');
    expect(() =>
      splitLegacyStyleProps({ lineHeight: '$auto' }, 'light'),
    ).toThrow('Unsupported Gluestack line-height token: $auto');
  });
});
