// The guided tour: eight steps, shown one at a time in the tour panel.
// Pure data, so the main process and the tests can read it.
const STEPS = [
  { id: 'meet', title: 'Meet Mochi', text: 'A small buddy that lives on the desktop: gentle reminders, a place to unload a worry and a friendly face on long days.', button: 'Say hello' },
  { id: 'join', title: 'Join the company', text: 'One code, or IT rolls it out quietly. From here on, your company’s own support contacts come first.', button: 'Open Mochi for Teams' },
  { id: 'worry', title: 'A heavy day', text: 'Feed Mochi a worry. The reply is written on this laptop, and your company’s EAP and HR contacts show first. Press Feed it.', button: 'Open Feed me a worry' },
  { id: 'call', title: 'Quiet on calls', text: 'When a call starts, Mochi fades and holds its reminders. This pretends a call is running for about 40 seconds.', button: 'Start a simulated call' },
  { id: 'break', title: 'A real break', text: 'Mochi nudges you to drink water. Click Done: it counts as a real break only if the keyboard and mouse really go quiet.', button: 'Show a water reminder' },
  { id: 'bigcall', title: 'Before a big call', text: 'A little pep talk before the call, and “how did it go?” after.', button: 'Give me the pep talk' },
  { id: 'shared', title: 'What HR sees', text: 'Counts worked out on this laptop, shown here before anything is shared. Never words. Teams under 8 people are hidden. This is a sample week.', button: 'Show what is shared' },
  { id: 'pulse', title: 'The HR view', text: 'Mochi Pulse shows team totals only. It uses sample data for a made-up company.', button: 'Open Mochi Pulse' },
];

// Shown in the worry box for step 3. Mild on purpose: it brings up the
// company contacts without being alarming in front of a client.
const SAMPLE_WORRY = 'The deadline moved to Friday again and I keep thinking, what’s the point?';

module.exports = { STEPS, SAMPLE_WORRY };
