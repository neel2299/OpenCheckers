import React, { type ReactNode } from 'react';
import { ScrollView } from 'react-native';

export function Page({ children }: { children: ReactNode }) {
  return <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 16, width: '100%', maxWidth: 740, alignSelf: 'center' }}>{children}</ScrollView>;
}
