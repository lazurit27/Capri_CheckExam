import React from 'react';
import { useRouter } from 'expo-router';
import { ProfileView } from '../../views/ProfileView';

export default function ProfileScreen() {
  const router = useRouter();
  return <ProfileView onBack={() => router.back()} />;
}