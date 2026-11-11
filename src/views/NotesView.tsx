import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { api } from '../api/client';
import { CyberButton, CyberInput, Frame, Txt } from '../components/ui';
import { useCars } from '../context/CarContext';
import { useTheme } from '../context/SettingsContext';
import type { Note, NoteType } from '../types/Note.type';
import { SubHeader } from '../components/SubHeader';

const TYPES: (NoteType | 'ALL')[] = ['ALL', 'Owner', 'Fault', 'Refuel', 'Critical', 'Test'];
const TYPE_LABEL: Record<NoteType | 'ALL', string> = {
  ALL: 'ALL', Owner: 'MY', Fault: 'ERRORS', Refuel: 'REFUEL', Critical: 'CRITICAL', Test: 'TEST',
};

export function NotesView({ onBack }: { onBack: () => void }) {
  const t = useTheme();
  const { car } = useCars();
  const [type, setType] = useState<NoteType | 'ALL'>('ALL');
  const [scope, setScope] = useState<'car' | 'all'>(car ? 'car' : 'all');
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);

  // форма (новая / редактирование)
  const [editId, setEditId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [price, setPrice] = useState('');

  const load = useCallback(async () => {
    try {
      const f = type === 'ALL' ? undefined : type;
      const list = scope === 'car' && car ? await api.carNotes(car.id, f) : await api.myNotes(f);
      setNotes(list);
      setError(null);
    } catch (e) { setError((e as Error).message); }
  }, [type, scope, car?.id]); 


  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setError(null);
    const p = price.trim() ? parseFloat(price.replace(',', '.')) : null;
    try {
      if (editId) await api.updateNote(editId, text.trim(), p);
      else if (car) await api.createNote(car.id, text.trim(), p);
      setEditId(null); setText(''); setPrice('');
      await load();
    } catch (e) { setError((e as Error).message); }
  };

  const remove = (n: Note) => Alert.alert('Delete note?', n.description, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await api.deleteNote(n.id); await load(); } catch (e) { setError((e as Error).message); }
    } },
  ]);

  const typeColor = (nt: NoteType) =>
    nt === 'Critical' || nt === 'Fault' ? t.crit : nt === 'Test' ? t.warn : nt === 'Refuel' ? t.value : t.primary;

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <SubHeader title="[NOTES]" onBack={onBack} />

      {car ? (
        <Frame title={editId ? 'EDIT NOTE' : `NEW NOTE → ${car.name.toUpperCase()}`} style={{ paddingTop: 20 }}>
          <CyberInput label="[TEXT]" value={text} onChangeText={setText} multiline placeholder="[Change Oil, 5W-30]" autoCapitalize="sentences" />
          <CyberInput label="[PRICE (OPTIONAL)]" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <View style={{ flexDirection: 'row' }}>
            <CyberButton label={editId ? '[SAVE]' : '[ADD]'} small onPress={save} disabled={!text.trim()} />
            {editId && <CyberButton label="[CANCEL]" small color={t.dim} style={{ marginLeft: 10 }}
              onPress={() => { setEditId(null); setText(''); setPrice(''); }} />}
          </View>
        </Frame>
      ) : (
        <Txt color={t.dim} size={12}>Select an active car in the garage to write notes.</Txt>
      )}

      {/* фильтр по типу */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 }}>
        {TYPES.map(k => (
          <Chip key={k} label={TYPE_LABEL[k]} active={type === k} onPress={() => setType(k)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {car && <Chip label="[THIS CAR]" active={scope === 'car'} onPress={() => setScope('car')} />}
        <Chip label="[ALL MY CARS]" active={scope === 'all'} onPress={() => setScope('all')} />
      </View>

      {error && <Txt color={t.crit} size={12} style={{ marginTop: 10 }}>{'!! ' + error}</Txt>}
      {notes.length === 0 && !error && <Txt color={t.dim} style={{ marginTop: 14 }}>{'> no notes'}</Txt>}

      {notes.map(n => (
        <Frame key={n.id} title={n.type.toUpperCase()} right={n.editable ? undefined : 'SYS 🔒'} color={typeColor(n.type)} style={{ marginTop: 14 }}>
          <Txt size={10} color={t.dim}>{new Date(n.date).toLocaleString()} · {n.carName}</Txt>
          <Txt size={14} color={t.value} style={{ marginTop: 4 }}>{n.description}</Txt>
          {n.price != null && <Txt size={12} color={t.primary}>₼ {n.price}</Txt>}
          {n.editable && (
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <CyberButton label="[EDIT]" small onPress={() => { setEditId(n.id); setText(n.description); setPrice(n.price != null ? String(n.price) : ''); }} />
              <CyberButton label="[DELETE]" small color={t.crit} style={{ marginLeft: 10 }} onPress={() => remove(n)} />
            </View>
          )}
        </Frame>
      ))}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={{
      borderWidth: 1, borderColor: active ? t.primary : t.dim,
      backgroundColor: active ? t.primary : 'transparent',
      paddingHorizontal: 8, paddingVertical: 4, marginRight: 6, marginBottom: 6,
    }}>
      <Txt size={11} color={active ? t.bg : t.dim}>{label}</Txt>
    </Pressable>
  );
}
