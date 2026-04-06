import { useState } from 'react';
import { DAILY_STEPS, WEEKLY_STEPS } from '../data/rituals.js';
import { DAILY_DETAILS, WEEKLY_DETAILS } from '../data/ritualDetails.js';

const RITUAL_CONFIG = {
  daily:  { steps: DAILY_STEPS,  details: DAILY_DETAILS,  totalTime: '10 MIN' },
  weekly: { steps: WEEKLY_STEPS, details: WEEKLY_DETAILS, totalTime: '22 MIN' },
};

export function useRitualTab() {
  const [activeTab, setActiveTab] = useState('daily');
  const { steps, details, totalTime } = RITUAL_CONFIG[activeTab];
  return { activeTab, setActiveTab, steps, details, totalTime };
}
