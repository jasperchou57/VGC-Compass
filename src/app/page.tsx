// This page is no longer needed - redirect is handled in next.config.ts
// Keeping as fallback for edge cases
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/vgc/reg-f/');
}
