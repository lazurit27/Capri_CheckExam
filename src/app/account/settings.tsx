import React from 'react';
import { useRouter } from 'expo-router';
import { SettingsView } from '../../views/SettingsView';

export default function SettingsScreen() {
  const router = useRouter();
  return <SettingsView onBack={() => router.back()} />;
}