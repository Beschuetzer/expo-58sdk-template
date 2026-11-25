import type { SexCoinSide } from '@expo-50sdk-template/shared-types';
import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const FLIP_TURN_DURATION_MS = 360;
const FLIP_QUARTER_TURN_DURATION_MS = FLIP_TURN_DURATION_MS / 4;
const FLIP_HALF_TURN_DURATION_MS = FLIP_TURN_DURATION_MS / 2;
const FLIP_EDGE_SCALE = 0.08;
const COIN_HEADS_IMAGE = require('../../../assets/images/washington-quarter-1944-obverse.png');
const COIN_TAILS_IMAGE = require('../../../assets/images/washington-quarter-1944-reverse.png');

function CoinFace({ side }: { side: SexCoinSide }) {
  const isHeads = side === 'heads';

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.face}
      testID={`sex-coin-${side}`}
    >
      <Image
        accessible={false}
        resizeMode="contain"
        source={isHeads ? COIN_HEADS_IMAGE : COIN_TAILS_IMAGE}
        style={styles.coinImage}
      />
    </View>
  );
}

export function SexCoinSimulation({
  accessibilityLabel,
  isFlipping,
  outcome,
}: {
  accessibilityLabel: string;
  isFlipping: boolean;
  outcome: SexCoinSide | null;
}) {
  const flipScale = useSharedValue(1);
  const [displayedSide, setDisplayedSide] = useState<SexCoinSide>(
    outcome ?? 'heads',
  );
  const wasFlipping = useRef(false);
  const previousOutcome = useRef(outcome);
  const latestOutcome = useRef(outcome);
  const sideChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sideChangeInterval = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const landingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latestOutcome.current = outcome;

    const startedFlipping = isFlipping && !wasFlipping.current;
    const stoppedFlipping = !isFlipping && wasFlipping.current;
    const clearSideChangeTimers = () => {
      if (sideChangeTimer.current !== null) {
        clearTimeout(sideChangeTimer.current);
        sideChangeTimer.current = null;
      }
      if (sideChangeInterval.current !== null) {
        clearInterval(sideChangeInterval.current);
        sideChangeInterval.current = null;
      }
    };

    if (startedFlipping) {
      clearSideChangeTimers();
      if (landingTimer.current !== null) {
        clearTimeout(landingTimer.current);
        landingTimer.current = null;
      }

      setDisplayedSide(outcome ?? 'heads');
      cancelAnimation(flipScale);
      flipScale.value = 1;
      flipScale.value = withRepeat(
        withSequence(
          withTiming(FLIP_EDGE_SCALE, {
            duration: FLIP_QUARTER_TURN_DURATION_MS,
            easing: Easing.linear,
          }),
          withTiming(1, {
            duration: FLIP_QUARTER_TURN_DURATION_MS,
            easing: Easing.linear,
          }),
          withTiming(FLIP_EDGE_SCALE, {
            duration: FLIP_QUARTER_TURN_DURATION_MS,
            easing: Easing.linear,
          }),
          withTiming(1, {
            duration: FLIP_QUARTER_TURN_DURATION_MS,
            easing: Easing.linear,
          }),
        ),
        -1,
        false,
      );
      sideChangeTimer.current = setTimeout(() => {
        sideChangeTimer.current = null;
        setDisplayedSide((side) => (side === 'heads' ? 'tails' : 'heads'));
        sideChangeInterval.current = setInterval(() => {
          setDisplayedSide((side) => (side === 'heads' ? 'tails' : 'heads'));
        }, FLIP_HALF_TURN_DURATION_MS);
      }, FLIP_QUARTER_TURN_DURATION_MS);
    } else if (stoppedFlipping) {
      clearSideChangeTimers();
      cancelAnimation(flipScale);
      flipScale.value = withSequence(
        withTiming(FLIP_EDGE_SCALE, {
          duration: FLIP_QUARTER_TURN_DURATION_MS,
          easing: Easing.linear,
        }),
        withTiming(1, {
          duration: FLIP_QUARTER_TURN_DURATION_MS,
          easing: Easing.linear,
        }),
      );
      landingTimer.current = setTimeout(() => {
        setDisplayedSide(latestOutcome.current ?? 'heads');
        landingTimer.current = null;
      }, FLIP_QUARTER_TURN_DURATION_MS);
    } else if (!isFlipping && previousOutcome.current !== outcome) {
      if (landingTimer.current === null) {
        setDisplayedSide(outcome ?? 'heads');
        cancelAnimation(flipScale);
        flipScale.value = withTiming(1, {
          duration: 350,
          easing: Easing.out(Easing.cubic),
        });
      }
    }

    wasFlipping.current = isFlipping;
    previousOutcome.current = outcome;
  }, [flipScale, isFlipping, outcome]);

  const animatedCoinStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: flipScale.value }],
  }));

  useEffect(
    () => () => {
      if (sideChangeTimer.current !== null) {
        clearTimeout(sideChangeTimer.current);
      }
      if (sideChangeInterval.current !== null) {
        clearInterval(sideChangeInterval.current);
      }
      if (landingTimer.current !== null) {
        clearTimeout(landingTimer.current);
      }
      cancelAnimation(flipScale);
    },
    [flipScale],
  );

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={styles.stage}
      testID="sex-coin"
    >
      <Animated.View style={[styles.coin, animatedCoinStyle]}>
        <CoinFace side={displayedSide} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    height: 190,
    justifyContent: 'center',
    width: '100%',
  },
  coin: {
    alignItems: 'center',
    backgroundColor: '#737980',
    borderColor: '#41464d',
    borderRadius: 78,
    borderWidth: 3,
    elevation: 8,
    height: 156,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 6,
    width: 156,
  },
  face: {
    bottom: 0,
    left: 0,
    position: 'absolute' as const,
    right: 0,
    top: 0,
  },
  coinImage: {
    borderRadius: 72,
    height: '100%',
    width: '100%',
  },
});
