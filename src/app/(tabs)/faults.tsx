import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, ZoomOut } from 'react-native-reanimated';
import { api } from '../../api/client';
import { BotBackdrop } from '../../bot/Bot';
import { Block, CyberButton, Frame, Sticks, Txt } from '../../components/ui';
import { useCars } from '../../context/CarContext';
import { useTheme } from '../../context/SettingsContext';
import type { FaultCode } from '../../types/Fault.type';

type TileState = 'pending' | 'checking' | 'clear' | 'found';

const STEP_MS = 320;

export default function FaultsTab() {
  const t = useTheme();
  const { car, activeFaults, runFaultTest, clearFaultTest, refreshFaults } = useCars();
  const [library, setLibrary] = useState<FaultCode[]>([]);
  const [cursor, setCursor] = useState(-1); 
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const scanning = cursor >= 0 && cursor < library.length;
  const active = useMemo(() => new Map(activeFaults.map(f => [f.faultCodeId, f])), [activeFaults]);

  const startScan = useCallback(async () => {
    try {
      const lib = await (library.length ? Promise.resolve(library) : api.faultLibrary());
      await refreshFaults();
      setError(null);
      setLibrary(lib);
      setCursor(0);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [library, refreshFaults]);


  useEffect(() => {
    if (!scanning) return;
    const id = setTimeout(() => setCursor(c => c + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [cursor, scanning]);

 
  useEffect(() => {
    if (car) startScan();
  }, [car?.id]);

  
  const stateOf = (i: number, id: number): TileState =>
    scanning && i > cursor ? 'pending'
      : scanning && i === cursor ? 'checking'
        : active.has(id) ? 'found'
          : 'clear';

  const doTest = async () => {
    setBusy(true);
    try { await runFaultTest(); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };
  const doClear = async () => {
    setBusy(true);
    try { await clearFaultTest(); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };

  if (!car) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <BotBackdrop />
        <Frame title="NO VEHICLE" color={t.dim}>
          <Txt color={t.dim}>No active vehicle — nothing to scan.</Txt>
        </Frame>
      </View>
    );
  }

  const tiles = library
    .map((f, i) => ({ f, state: stateOf(i, f.id) }))
    .filter(x => x.state !== 'clear');
  const foundCount = cursor < 0 ? 0 : tiles.filter(x => x.state === 'found').length;
  const progress = library.length ? Math.max(0, cursor) / library.length : 0;
  const hasTest = activeFaults.some(f => f.isTest);

  return (
    <View style={{ flex: 1 }}>
      <BotBackdrop />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Frame title="DIAGNOSTIC SCAN" right={scanning ? `${Math.round(progress * 100)}%` : 'DONE'}>
          <Sticks ratio={scanning ? progress : 1} color={scanning ? t.primary : foundCount ? t.crit : t.primary} count={24} height={10} />
          <Txt size={12} color={foundCount ? t.crit : t.dim} style={{ marginTop: 6 }}>
            {scanning
              ? `> check ${library[cursor]?.code ?? ''}...`
              : foundCount
                ? `> errors found: ${foundCount}`
                : '> No errors found. Systems are clean.'}
          </Txt>
        </Frame>

        {error && <Txt color={t.crit} size={12} style={{ marginTop: 8 }}>{'!! ' + error}</Txt>}

        <View style={styles.grid}>
          {tiles.map(({ f, state }) => (
            <FaultTile key={f.id} fault={f} state={state} isTest={active.get(f.id)?.isTest ?? false} />
          ))}
        </View>
      </ScrollView>

      <View style={[styles.actions, { borderColor: t.dim }]}>
        <CyberButton label="RESCAN" small onPress={startScan} disabled={scanning} style={{ flex: 1 }} />
        <CyberButton label={hasTest ? 'TEST RESET' : 'ERROR TEST'} small color={hasTest ? t.warn : t.crit}
          onPress={hasTest ? doClear : doTest} disabled={busy || scanning} style={{ flex: 1.4, marginLeft: 10 }} />
      </View>
    </View>
  );
}

function FaultTile({ fault, state, isTest }: { fault: FaultCode; state: TileState; isTest: boolean }) {
  const t = useTheme();
  const color = state === 'found' ? t.crit : state === 'checking' ? t.primary : t.dim;
  const label = state === 'checking' ? 'SCAN…' : state === 'found' ? (isTest ? 'TEST' : fault.severity.toUpperCase()) : '···';

  return (
    <Animated.View
      style={styles.tileWrap}
      entering={FadeIn.duration(200)}
      exiting={ZoomOut.duration(380)}
      layout={LinearTransition.duration(250)}
    >
      <Block color={color} style={{ minHeight: 78 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Txt size={16} color={t.onFill}>{fault.code}</Txt>
          <Txt size={10} color={t.onFill}>{label}</Txt>
        </View>
        <Txt size={10} color={t.onFill} numberOfLines={3} style={{ marginTop: 4, opacity: 0.9 }}>{fault.description}</Txt>
      </Block>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginTop: 10 },
  tileWrap: { width: '50%', padding: 4 },
  actions: { flexDirection: 'row', padding: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
