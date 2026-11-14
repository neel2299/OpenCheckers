import React from 'react';
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();
  return <html lang="en" {...htmlAttributes}><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" /><meta name="theme-color" content="#F3F5F1" /><title>OpenCheckers · Checkers & Analysis</title><ScrollViewStyleReset />{headNodes}</head><body {...bodyAttributes}>{children}{bodyNodes}</body></html>;
}
