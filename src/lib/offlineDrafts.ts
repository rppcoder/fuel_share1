import { Trip } from '../types/database';

const OFFLINE_DRAFTS_KEY = 'fuelshare_pending_offline_trips';

export function getOfflineDrafts(): Trip[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_DRAFTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read offline drafts:', err);
    return [];
  }
}

export function saveOfflineDraft(trip: Trip): void {
  try {
    const drafts = getOfflineDrafts();
    const existingIndex = drafts.findIndex((d) => d.id === trip.id);
    const draftTrip: Trip = {
      ...trip,
      is_local_draft: true,
    };

    if (existingIndex >= 0) {
      drafts[existingIndex] = draftTrip;
    } else {
      drafts.unshift(draftTrip);
    }
    localStorage.setItem(OFFLINE_DRAFTS_KEY, JSON.stringify(drafts));
  } catch (err) {
    console.error('Failed to save offline draft:', err);
  }
}

export function removeOfflineDraft(tripId: string): void {
  try {
    const drafts = getOfflineDrafts().filter((d) => d.id !== tripId);
    localStorage.setItem(OFFLINE_DRAFTS_KEY, JSON.stringify(drafts));
  } catch (err) {
    console.error('Failed to remove offline draft:', err);
  }
}

export function clearAllOfflineDrafts(): void {
  try {
    localStorage.removeItem(OFFLINE_DRAFTS_KEY);
  } catch (err) {
    console.error('Failed to clear offline drafts:', err);
  }
}
