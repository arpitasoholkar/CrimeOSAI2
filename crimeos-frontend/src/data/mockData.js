// Shape mirrors what /api/cases, /api/stats and /api/activity are expected
// to return. Swap the imports in Dashboard.jsx for axios calls once the
// endpoints exist — component props don't need to change.

export const heroStats = [
  { id: 'total', label: 'Total Cases', value: 128, trend: '+12% from last week', direction: 'up', icon: 'folder', tone: 'accent' },
  { id: 'pending', label: 'Pending', value: 18, trend: '+8% from last week', direction: 'up', icon: 'hourglass', tone: 'warning' },
  { id: 'investigation', label: 'Under Investigation', value: 45, trend: '+15% from last week', direction: 'up', icon: 'search', tone: 'violet' },
  { id: 'resolved', label: 'Resolved', value: 65, trend: '+10% from last week', direction: 'up', icon: 'check', tone: 'success' },
]

export const recentCases = [
  {
    id: 'CASE-000021',
    title: 'Online Payment Fraud',
    status: 'Under Investigation',
    evidence: [
      { type: 'pdf' },
      { type: 'image' },
      { type: 'audio' },
    ],
    extraEvidence: 2,
    risk: 'High',
    updated: '5 min ago',
  },
  {
    id: 'CASE-000020',
    title: 'UPI Scam Complaint',
    status: 'Pending',
    evidence: [{ type: 'pdf' }, { type: 'image' }],
    extraEvidence: 1,
    risk: 'Medium',
    updated: '1 hour ago',
  },
  {
    id: 'CASE-000019',
    title: 'Phishing & Identity Theft',
    status: 'Under Investigation',
    evidence: [{ type: 'pdf' }, { type: 'image' }, { type: 'audio' }],
    extraEvidence: 3,
    risk: 'High',
    updated: '3 hours ago',
  },
  {
    id: 'CASE-000018',
    title: 'Investment Fraud',
    status: 'Resolved',
    evidence: [{ type: 'pdf' }, { type: 'image' }],
    extraEvidence: 0,
    risk: 'Low',
    updated: '1 day ago',
  },
]

export const activityFeed = [
  { id: 1, caseId: 'CASE-000021', type: 'case_created', label: 'New case created', time: '10:30 AM' },
  { id: 2, caseId: 'CASE-000017', type: 'analysis_completed', label: 'Analysis completed', time: '09:15 AM' },
  { id: 3, caseId: 'CASE-000020', type: 'evidence_uploaded', label: 'Evidence added', time: '08:45 AM' },
  { id: 4, caseId: 'CASE-000019', type: 'status_updated', label: 'Status updated', time: 'Yesterday' },
]

export const quickActions = [
  { id: 'upload', label: 'Upload Evidence', icon: 'upload' },
  { id: 'report', label: 'Generate Report', icon: 'report' },
  { id: 'search', label: 'Search Entities', icon: 'search' },
]
