#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist', 'etsy');
const TEMPLATES_DIR = path.join(ROOT, 'templates');

fs.mkdirSync(DIST, { recursive: true });
fs.mkdirSync(TEMPLATES_DIR, { recursive: true });

const today = new Date().toISOString().slice(0, 10);

const templates = {
  'adhd-friendly': {
    version: 6,
    description: 'ADHD-Friendly week — short blocks, frequent breaks, brain dump sessions',
    events: [
      { id: 'tpl_adhd_1', title: 'Morning Routine', date: today, startTime: '07:00', endTime: '07:30', allDay: false, category: 'personal-other', type: 'event', completed: false, recurrence: { freq: 'daily', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'protected' },
      { id: 'tpl_adhd_2', title: 'Focus Block 1', date: today, startTime: '08:00', endTime: '09:00', allDay: false, category: 'work-money', type: 'event', completed: false, recurrence: { freq: 'weekdays', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'protected', description: '50 min work + 10 min break' },
      { id: 'tpl_adhd_3', title: 'Movement Break', date: today, startTime: '09:00', endTime: '09:15', allDay: false, category: 'personal-other', type: 'event', completed: false, recurrence: { freq: 'weekdays', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'flexible' },
      { id: 'tpl_adhd_4', title: 'Focus Block 2', date: today, startTime: '09:15', endTime: '10:15', allDay: false, category: 'work-money', type: 'event', completed: false, recurrence: { freq: 'weekdays', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'protected' },
      { id: 'tpl_adhd_5', title: 'Brain Dump + Planning', date: today, startTime: '10:15', endTime: '10:30', allDay: false, category: 'personal-other', type: 'event', completed: false, recurrence: { freq: 'weekdays', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'flexible' },
      { id: 'tpl_adhd_6', title: 'Lunch & Recharge', date: today, startTime: '12:00', endTime: '13:00', allDay: false, category: 'food-meals', type: 'event', completed: false, recurrence: { freq: 'daily', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'flexible' },
      { id: 'tpl_adhd_7', title: 'Afternoon Focus', date: today, startTime: '13:00', endTime: '14:30', allDay: false, category: 'work-money', type: 'event', completed: false, recurrence: { freq: 'weekdays', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'protected' },
      { id: 'tpl_adhd_8', title: 'Walk / Exercise', date: today, startTime: '16:00', endTime: '16:30', allDay: false, category: 'personal-other', type: 'event', completed: false, recurrence: { freq: 'weekdays', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'flexible' },
      { id: 'tpl_adhd_9', title: 'Wind Down', date: today, startTime: '21:00', endTime: '22:00', allDay: false, category: 'entertainment', type: 'event', completed: false, recurrence: { freq: 'daily', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'flexible' },
    ],
    goals: [
      { id: 'tpl_adhd_g1', title: 'Work', category: 'work-money', targetHoursPerWeek: 30, description: 'Manageable work hours', active: true },
      { id: 'tpl_adhd_g2', title: 'Personal', category: 'personal-other', targetHoursPerWeek: 10, description: 'Self-care and recharge', active: true },
    ],
    habits: [
      { id: 'tpl_adhd_h1', name: 'Brain dump', category: 'personal-other', targetFrequency: { type: 'daily', timesPerWeek: 7, daysOfWeek: [0,1,2,3,4,5,6] }, duration: 10, priority: 'high', status: 'active', startDate: today },
      { id: 'tpl_adhd_h2', name: 'Movement break', category: 'personal-other', targetFrequency: { type: 'weekdays', timesPerWeek: 5, daysOfWeek: [0,1,2,3,4] }, duration: 15, priority: 'medium', status: 'active', startDate: today },
    ],
    preferences: { sleepHours: 8, workHoursTarget: 6 },
    categories: null,
    habitLog: [],
    aiHistory: [],
  },

  'student': {
    version: 6,
    description: 'Student schedule — classes, study blocks, social time',
    events: [
      { id: 'tpl_stu_1', title: 'Morning Class', date: today, startTime: '09:00', endTime: '10:30', allDay: false, category: 'work-money', type: 'event', completed: false, recurrence: { freq: 'weekly', interval: 1, daysOfWeek: [0,2,4], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'fixed' },
      { id: 'tpl_stu_2', title: 'Study Block', date: today, startTime: '11:00', endTime: '13:00', allDay: false, category: 'work-money', type: 'event', completed: false, recurrence: { freq: 'weekdays', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'protected' },
      { id: 'tpl_stu_3', title: 'Lunch with friends', date: today, startTime: '13:00', endTime: '14:00', allDay: false, category: 'family', type: 'event', completed: false, recurrence: { freq: 'weekdays', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'flexible' },
      { id: 'tpl_stu_4', title: 'Afternoon Class', date: today, startTime: '14:00', endTime: '15:30', allDay: false, category: 'work-money', type: 'event', completed: false, recurrence: { freq: 'weekly', interval: 1, daysOfWeek: [1,3], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'fixed' },
      { id: 'tpl_stu_5', title: 'Exercise', date: today, startTime: '17:00', endTime: '18:00', allDay: false, category: 'personal-other', type: 'event', completed: false, recurrence: { freq: 'weekly', interval: 1, daysOfWeek: [0,2,4], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'flexible' },
    ],
    goals: [
      { id: 'tpl_stu_g1', title: 'Study', category: 'work-money', targetHoursPerWeek: 25, active: true },
      { id: 'tpl_stu_g2', title: 'Social', category: 'family', targetHoursPerWeek: 10, active: true },
      { id: 'tpl_stu_g3', title: 'Exercise', category: 'personal-other', targetHoursPerWeek: 5, active: true },
    ],
    habits: [
      { id: 'tpl_stu_h1', name: 'Review notes', category: 'work-money', targetFrequency: { type: 'weekdays', timesPerWeek: 5, daysOfWeek: [0,1,2,3,4] }, duration: 30, priority: 'high', status: 'active', startDate: today },
    ],
    preferences: { sleepHours: 8, workHoursTarget: 5 },
    categories: null, habitLog: [], aiHistory: [],
  },

  'working-parent': {
    version: 6,
    description: 'Working Parent — work hours, school runs, family time, self-care',
    events: [
      { id: 'tpl_wp_1', title: 'School Drop-off', date: today, startTime: '07:30', endTime: '08:00', allDay: false, category: 'family', type: 'event', completed: false, recurrence: { freq: 'weekdays', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'fixed' },
      { id: 'tpl_wp_2', title: 'Work', date: today, startTime: '08:30', endTime: '16:30', allDay: false, category: 'work-money', type: 'event', completed: false, recurrence: { freq: 'weekdays', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'protected' },
      { id: 'tpl_wp_3', title: 'School Pickup', date: today, startTime: '15:30', endTime: '16:00', allDay: false, category: 'family', type: 'event', completed: false, recurrence: { freq: 'weekdays', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'fixed' },
      { id: 'tpl_wp_4', title: 'Family Dinner', date: today, startTime: '18:00', endTime: '19:00', allDay: false, category: 'family', type: 'event', completed: false, recurrence: { freq: 'daily', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'protected' },
      { id: 'tpl_wp_5', title: 'Kids Bedtime Routine', date: today, startTime: '19:30', endTime: '20:30', allDay: false, category: 'family', type: 'event', completed: false, recurrence: { freq: 'daily', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'protected' },
      { id: 'tpl_wp_6', title: 'Me Time', date: today, startTime: '20:30', endTime: '21:30', allDay: false, category: 'entertainment', type: 'event', completed: false, recurrence: { freq: 'daily', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'flexible' },
    ],
    goals: [
      { id: 'tpl_wp_g1', title: 'Work', category: 'work-money', targetHoursPerWeek: 40, active: true },
      { id: 'tpl_wp_g2', title: 'Family', category: 'family', targetHoursPerWeek: 25, active: true },
      { id: 'tpl_wp_g3', title: 'Self-care', category: 'personal-other', targetHoursPerWeek: 5, active: true },
    ],
    habits: [
      { id: 'tpl_wp_h1', name: 'Exercise', category: 'personal-other', targetFrequency: { type: 'custom', timesPerWeek: 3, daysOfWeek: [0,2,4] }, duration: 30, priority: 'medium', status: 'active', startDate: today },
      { id: 'tpl_wp_h2', name: 'Read with kids', category: 'family', targetFrequency: { type: 'daily', timesPerWeek: 7, daysOfWeek: [0,1,2,3,4,5,6] }, duration: 20, priority: 'high', status: 'active', startDate: today },
    ],
    preferences: { sleepHours: 7, workHoursTarget: 8 },
    categories: null, habitLog: [], aiHistory: [],
  },

  'faith-prayer': {
    version: 6,
    description: 'Faith & Prayer — daily prayer times, scripture study, community service',
    events: [
      { id: 'tpl_fp_1', title: 'Fajr / Morning Prayer', date: today, startTime: '05:30', endTime: '06:00', allDay: false, category: 'faith', type: 'event', completed: false, recurrence: { freq: 'daily', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'fixed' },
      { id: 'tpl_fp_2', title: 'Scripture Study', date: today, startTime: '06:00', endTime: '06:30', allDay: false, category: 'faith', type: 'event', completed: false, recurrence: { freq: 'daily', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'protected' },
      { id: 'tpl_fp_3', title: 'Dhuhr / Midday Prayer', date: today, startTime: '12:30', endTime: '12:45', allDay: false, category: 'faith', type: 'event', completed: false, recurrence: { freq: 'daily', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'fixed' },
      { id: 'tpl_fp_4', title: 'Asr / Afternoon Prayer', date: today, startTime: '15:30', endTime: '15:45', allDay: false, category: 'faith', type: 'event', completed: false, recurrence: { freq: 'daily', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'fixed' },
      { id: 'tpl_fp_5', title: 'Maghrib / Evening Prayer', date: today, startTime: '18:30', endTime: '18:45', allDay: false, category: 'faith', type: 'event', completed: false, recurrence: { freq: 'daily', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'fixed' },
      { id: 'tpl_fp_6', title: 'Isha / Night Prayer', date: today, startTime: '20:30', endTime: '20:45', allDay: false, category: 'faith', type: 'event', completed: false, recurrence: { freq: 'daily', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'fixed' },
      { id: 'tpl_fp_7', title: 'Community Service', date: today, startTime: '10:00', endTime: '12:00', allDay: false, category: 'faith', type: 'event', completed: false, recurrence: { freq: 'weekly', interval: 1, daysOfWeek: [5], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'flexible' },
    ],
    goals: [
      { id: 'tpl_fp_g1', title: 'Faith', category: 'faith', targetHoursPerWeek: 14, active: true },
      { id: 'tpl_fp_g2', title: 'Work', category: 'work-money', targetHoursPerWeek: 40, active: true },
      { id: 'tpl_fp_g3', title: 'Family', category: 'family', targetHoursPerWeek: 14, active: true },
    ],
    habits: [
      { id: 'tpl_fp_h1', name: 'Morning dhikr / meditation', category: 'faith', targetFrequency: { type: 'daily', timesPerWeek: 7, daysOfWeek: [0,1,2,3,4,5,6] }, duration: 15, priority: 'high', status: 'active', startDate: today },
      { id: 'tpl_fp_h2', name: 'Gratitude journal', category: 'faith', targetFrequency: { type: 'daily', timesPerWeek: 7, daysOfWeek: [0,1,2,3,4,5,6] }, duration: 5, priority: 'medium', status: 'active', startDate: today },
    ],
    preferences: { sleepHours: 7, workHoursTarget: 8 },
    categories: null, habitLog: [], aiHistory: [],
  },

  'fitness': {
    version: 6,
    description: 'Fitness-focused week — workouts, meal prep, rest days, tracking',
    events: [
      { id: 'tpl_fit_1', title: 'Strength Training', date: today, startTime: '06:00', endTime: '07:00', allDay: false, category: 'personal-other', type: 'event', completed: false, recurrence: { freq: 'weekly', interval: 1, daysOfWeek: [0,2,4], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'protected' },
      { id: 'tpl_fit_2', title: 'Cardio / Run', date: today, startTime: '06:00', endTime: '06:45', allDay: false, category: 'personal-other', type: 'event', completed: false, recurrence: { freq: 'weekly', interval: 1, daysOfWeek: [1,3], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'protected' },
      { id: 'tpl_fit_3', title: 'Meal Prep', date: today, startTime: '10:00', endTime: '12:00', allDay: false, category: 'food-meals', type: 'event', completed: false, recurrence: { freq: 'weekly', interval: 1, daysOfWeek: [6], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'flexible' },
      { id: 'tpl_fit_4', title: 'Active Recovery / Yoga', date: today, startTime: '07:00', endTime: '07:30', allDay: false, category: 'personal-other', type: 'event', completed: false, recurrence: { freq: 'weekly', interval: 1, daysOfWeek: [5], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'flexible' },
    ],
    goals: [
      { id: 'tpl_fit_g1', title: 'Exercise', category: 'personal-other', targetHoursPerWeek: 7, active: true },
      { id: 'tpl_fit_g2', title: 'Meal prep', category: 'food-meals', targetHoursPerWeek: 5, active: true },
      { id: 'tpl_fit_g3', title: 'Sleep', category: 'sleep', targetHoursPerWeek: 56, active: true },
    ],
    habits: [
      { id: 'tpl_fit_h1', name: 'Track meals', category: 'food-meals', targetFrequency: { type: 'daily', timesPerWeek: 7, daysOfWeek: [0,1,2,3,4,5,6] }, duration: 5, priority: 'high', status: 'active', startDate: today },
      { id: 'tpl_fit_h2', name: 'Drink 3L water', category: 'personal-other', targetFrequency: { type: 'daily', timesPerWeek: 7, daysOfWeek: [0,1,2,3,4,5,6] }, duration: 5, priority: 'medium', status: 'active', startDate: today },
      { id: 'tpl_fit_h3', name: 'Stretch / mobility', category: 'personal-other', targetFrequency: { type: 'daily', timesPerWeek: 7, daysOfWeek: [0,1,2,3,4,5,6] }, duration: 10, priority: 'medium', status: 'active', startDate: today },
    ],
    preferences: { sleepHours: 8, workHoursTarget: 8 },
    categories: null, habitLog: [], aiHistory: [],
  },
};

// Write individual JSON files
Object.entries(templates).forEach(([name, data]) => {
  const filePath = path.join(TEMPLATES_DIR, `${name}-template.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Template: ${filePath}`);
});

// Write readme
const readme = `LifeBalance Planner — Starter Templates
========================================

These JSON files are pre-built schedules you can import into
LifeBalance Planner to get started quickly.

How to use:
1. Open LifeBalance Planner in your browser
2. Go to Settings → Import Backup
3. Select one of these .json files
4. Your planner will be populated with the template data

Templates included:
- adhd-friendly-template.json  — Short focus blocks, movement breaks, brain dumps
- student-template.json        — Classes, study blocks, social balance
- working-parent-template.json — Work, school runs, family time, self-care
- faith-prayer-template.json   — Daily prayer times, scripture study, community
- fitness-template.json        — Workout split, meal prep, tracking habits

Note: Importing a template replaces your current data.
Export a backup first if you want to keep your existing planner.
`;
fs.writeFileSync(path.join(TEMPLATES_DIR, 'README.txt'), readme);

// Create zip
try {
  // Use PowerShell's Compress-Archive (available on Windows)
  const zipPath = path.join(DIST, 'Starter-Templates.zip');
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  execSync(`powershell -Command "Compress-Archive -Path '${TEMPLATES_DIR.replace(/\\/g, '\\\\')}\\*' -DestinationPath '${zipPath.replace(/\\/g, '\\\\')}'"`);
  const zipSize = fs.statSync(zipPath).size;
  console.log(`\nZip: ${zipPath} (${(zipSize / 1024).toFixed(1)} KB)`);
} catch (e) {
  console.error('Failed to create zip:', e.message);
  console.log('Templates written as individual JSON files in templates/');
}
