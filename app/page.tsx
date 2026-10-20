'use client';
import { useEffect } from 'react';
import { startJournal } from '../lib/journal';
import { markup } from '../lib/markup';

export default function Page() {
  useEffect(() => { startJournal(); }, []);
  return <div dangerouslySetInnerHTML={{ __html: markup }} />;
}
