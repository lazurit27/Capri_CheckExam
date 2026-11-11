import React from 'react';
import { useRouter } from 'expo-router';
import { NotesView } from '../../views/NotesView';

export default function NotesScreen() {
  const router = useRouter();
  return <NotesView onBack={() => router.back()} />;
}