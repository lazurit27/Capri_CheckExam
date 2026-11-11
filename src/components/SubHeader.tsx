import React from 'react';
import { Pressable } from 'react-native';
import { useTheme } from '../context/SettingsContext';
import { Txt } from './ui';


export function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onBack} style={{ paddingVertical: 8 }}>
      <Txt size={14}>
        <Txt size={14} color={t.dim}>{'< account  / '}</Txt>
        {title}
      </Txt>
    </Pressable>
  );
}
