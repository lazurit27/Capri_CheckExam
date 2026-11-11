import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { api } from '../api/client';
import { CyberButton, CyberInput, Frame, Txt } from '../components/ui';
import { useCars } from '../context/CarContext';
import { useTheme } from '../context/SettingsContext';
import { statusColor } from '../constants/theme';
import type { Car } from '../types/Car.type';
import { SubHeader } from '../components/SubHeader';

export function CarsView({ onBack }: { onBack: () => void }) {
  const t = useTheme();
  const { cars, car: active, selectCar, reloadCars } = useCars();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [tank, setTank] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startEdit = (c: Car | null) => {
    setError(null);
    setEditing(c ? c.id : 'new');
    setName(c?.name ?? '');
    setTank(c ? String(c.tankCapacity) : '55');
  };

  const save = async () => {
    setError(null);
    const vol = parseFloat(tank.replace(',', '.'));
    try {
      if (editing === 'new') {
        const c = await api.createCar(name.trim(), vol);
        await reloadCars();
        selectCar(c.id);
      } else if (editing) {
        await api.updateCar(editing, name.trim(), vol);
        await reloadCars();
      }
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = (c: Car) => {
    Alert.alert('Delete Car?', `${c.name} and all its notes will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.deleteCar(c.id);
            if (active?.id === c.id) selectCar(null);
            await reloadCars();
          } catch (e) { setError((e as Error).message); }
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <SubHeader title="[GARAGE]" onBack={onBack} />

      {cars.length === 0 && <Txt color={t.dim} style={{ marginVertical: 10 }}>Garage is empty. Add your first car.</Txt>}

      {cars.map(c => {
        const isActive = active?.id === c.id;
        return (
          <Frame key={c.id} title={isActive ? 'ACTIVE' : undefined} right={c.status.toUpperCase()}
            color={isActive ? t.primary : t.dim} style={{ marginTop: 14 }}>
            {editing === c.id ? (
              <EditForm name={name} tank={tank} setName={setName} setTank={setTank} onSave={save} onCancel={() => setEditing(null)} />
            ) : (
              <>
                <Pressable onPress={() => selectCar(c.id)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 10, height: 10, backgroundColor: statusColor(t, c.status), marginRight: 8 }} />
                    <Txt size={18} color={isActive ? t.value : t.primary}>{c.name}</Txt>
                  </View>
                  <Txt size={11} color={t.dim}>tank: {c.tankCapacity} L {isActive ? '' : '· tap to make active'}</Txt>
                </Pressable>
                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                  <CyberButton label="[EDIT]" small onPress={() => startEdit(c)} />
                  <CyberButton label="[DELETE]" small color={t.crit} onPress={() => remove(c)} style={{ marginLeft: 10 }} />
                </View>
              </>
            )}
          </Frame>
        );
      })}

      {editing === 'new' ? (
        <Frame title="NEW VEHICLE" style={{ marginTop: 18, paddingTop: 20 }}>
          <EditForm name={name} tank={tank} setName={setName} setTank={setTank} onSave={save} onCancel={() => setEditing(null)} />
        </Frame>
      ) : (
        <CyberButton label="+[ADD CAR]" onPress={() => startEdit(null)} style={{ marginTop: 18 }} />
      )}

      {error && <Txt color={t.crit} size={12} style={{ marginTop: 10 }}>{'!! ' + error}</Txt>}
    </ScrollView>
  );
}

function EditForm({ name, tank, setName, setTank, onSave, onCancel }: {
  name: string; tank: string; setName: (v: string) => void; setTank: (v: string) => void;
  onSave: () => void; onCancel: () => void;
}) {
  const t = useTheme();
  return (
    <View>
      <CyberInput label="[NAME]" value={name} onChangeText={setName} placeholder="Quadra Turbo-R" autoCapitalize="words" />
      <CyberInput label="[TANK CAPACITY | L]" value={tank} onChangeText={setTank} keyboardType="decimal-pad" />
      <View style={{ flexDirection: 'row' }}>
        <CyberButton label="[SAVE]" small onPress={onSave} />
        <CyberButton label="[CANCEL]" small color={t.dim} onPress={onCancel} style={{ marginLeft: 10 }} />
      </View>
    </View>
  );
}
