import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Speedometer } from '../../components/Speedometer';
import { Block, CyberButton, Frame, Sticks, Txt } from '../../components/ui';
import { useCars } from '../../context/CarContext';
import { useTheme } from '../../context/SettingsContext';
import { useTelemetry } from '../../context/TelemetryContext';
import { levelColor, statusColor } from '../../constants/theme';
import type { CarStatus } from '../../types/Car.type';
import type { Level } from '../../types/Fault.type';
import { LIMITS, ratio } from '../../utils/levels';

const statusLabel: Record<CarStatus, string> = {
  Ok: 'SYSTEM: [OK]',
  Warning: 'SYSTEM: [WARNING]',
  Critical: 'SYSTEM: [CRITICAL ERR!]',
};

export default function MenuTab() {
  const t = useTheme();
  const tel = useTelemetry();
  const { car, status, activeFaults } = useCars();

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Speedometer speed={tel.speed} source={tel.speedSource} />

      {!car ? (
        <Frame title="NO VEHICLE" color={t.dim} style={{ marginTop: 12 }}>
          <Txt color={t.dim} size={13}>
            {"There's no active car selected. Add it: ACCOUNT → GARAGE.\nOnly the speedometer is working right now."}
          </Txt>
        </Frame>
      ) : (
        <>
          <Block color={statusColor(t, status)} style={{ marginTop: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt color={t.onFill} size={11}>STATUS://</Txt>
              <Txt color={t.onFill} size={11}>{`ERR × ${activeFaults.length}`}</Txt>
            </View>
            <Txt color={t.onFill} size={18} style={{ letterSpacing: 2 }}>{statusLabel[status]}</Txt>
          </Block>


          <View style={styles.grid}>
            <Pressable style={styles.cell} onLongPress={tel.refuel} delayLongPress={600}>
              <Gauge
                title="FUEL"
                level={tel.levels.fuel}
                value={`${tel.fuel.toFixed(1)}`}
                unit={`/ ${tel.fuelMax} L`}
                sub={`${tel.fuelPct.toFixed(0)}%  ·  hold = refueling`}
                r={tel.fuelPct / 100}
              />
            </Pressable>

            <View style={styles.cell}>
              <OilGauge temp={tel.oilTemp} pressure={tel.oilPressure} lt={tel.levels.oilTemp} lp={tel.levels.oilPressure} />
            </View>

            <View style={styles.cell}>
              <Gauge
                title="CONSUMPTION"
                level={tel.levels.consumption}
                value={tel.speed < 3 ? '--.-' : tel.consumption.toFixed(1)}
                unit="L/100"
                sub="instantaneous consumption"
                r={ratio(tel.consumption, LIMITS.consumption.min, LIMITS.consumption.max)}
              />
            </View>

            <View style={styles.cell}>
              <Gauge
                title="OUTSIDE"
                level={tel.levels.outsideTemp}
                value={tel.outsideTemp.toFixed(1)}
                unit="°C"
                sub={tel.outsideSource === 'real' ? 'GPS (open-meteo)' : 'Simulation'}
                r={ratio(tel.outsideTemp, LIMITS.outsideTemp.min, LIMITS.outsideTemp.max)}
              />
            </View>
          </View>
        </>
      )}

      <CyberButton
        label={tel.testDrive ? '■ STOP TEST' : '▶ TEST DRIVE'}
        color={tel.testDrive ? t.warn : t.primary}
        filled={tel.testDrive}
        onPress={() => tel.setTestDrive(!tel.testDrive)}
        style={{ marginTop: 18 }}
      />
    </ScrollView>
  );
}

function Gauge({
  title, value, unit, sub, r, level,
}: { title: string; value: string; unit: string; sub: string; r: number; level: Level }) {
  const t = useTheme();
  const c = levelColor(t, level);
  const v = levelColor(t, level, 'value');
  return (
    <Frame title={title} right={level === 'ok' ? undefined : level === 'warn' ? '!' : '!!'} color={c}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 }}>
        <Txt size={24} color={v}>{value}</Txt>
        <Txt size={11} color={c} style={{ marginLeft: 4, marginBottom: 4 }}>{unit}</Txt>
      </View>
      <Sticks ratio={r} color={c} count={14} height={16} />
      <Txt size={9} color={t.dim} style={{ marginTop: 4 }} numberOfLines={1}>{sub}</Txt>
    </Frame>
  );
}

function OilGauge({ temp, pressure, lt, lp }: { temp: number; pressure: number; lt: Level; lp: Level }) {
  const t = useTheme();
  const worst: Level = lt === 'crit' || lp === 'crit' ? 'crit' : lt === 'warn' || lp === 'warn' ? 'warn' : 'ok';
  const c = levelColor(t, worst);
  return (
    <Frame title="OIL" right={worst === 'ok' ? undefined : worst === 'warn' ? '!' : '!!'} color={c}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Txt size={18} color={levelColor(t, lt, 'value')}>{temp.toFixed(0)}°C</Txt>
        <Txt size={18} color={levelColor(t, lp, 'value')}>{pressure.toFixed(1)}bar</Txt>
      </View>
      <Sticks ratio={ratio(temp, LIMITS.oilTemp.min, LIMITS.oilTemp.max)} color={levelColor(t, lt)} count={14} height={7} style={{ marginTop: 4 }} />
      <Sticks ratio={ratio(pressure, LIMITS.oilPressure.min, LIMITS.oilPressure.max)} color={levelColor(t, lp)} count={14} height={7} style={{ marginTop: 3 }} />
      <Txt size={9} color={t.dim} style={{ marginTop: 4 }}>temperature / pressure</Txt>
    </Frame>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, marginTop: 6 },
  cell: { width: '50%', paddingHorizontal: 5, marginTop: 6 },
});