import React from 'react';
import { useRouter } from 'expo-router';
import { CarsView } from '../../views/CarsView';

export default function CarsScreen() {
  const router = useRouter();
  return <CarsView onBack={() => router.back()} />;
}