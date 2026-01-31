import { redirect } from 'next/navigation';
import { CURRENT_FORMAT_ID } from '@/lib/constants';

export default function Home() {
  redirect(`/vgc/${CURRENT_FORMAT_ID}/`);
}
