// Minimal stroke-icon set. Kept in one file so components don't each pull in
// a heavier icon package before the team decides on one (lucide-react drops
// in cleanly later — every icon here mirrors a lucide name).

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export const ShieldIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5l-8-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

export const GridIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)

export const FolderIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
)

export const PlusCircleIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </svg>
)

export const AnalysisIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
    <path d="M9 11h4M11 9v4" />
  </svg>
)

export const ReportIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M14 3v5h5M9 13h6M9 17h6" />
  </svg>
)

export const SettingsIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.63 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.63a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.37 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
  </svg>
)

export const SunIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)

export const MoonIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
)

export const SearchIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
)

export const BellIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
)

export const ChevronRightIcon = (p) => (
  <svg {...base} {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>
)

export const MenuIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
)

export const XIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M18 6 6 18M6 6l18 12" />
  </svg>
)

export const HourglassIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9" />
  </svg>
)

export const CheckCircleIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.5 2.5 2.5 5-5" />
  </svg>
)

export const FileTextIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M14 3v5h5M9 13h6M9 17h6" />
  </svg>
)

export const ImageIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </svg>
)

export const AudioIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 12v0M8 9v6M12 6v12M16 9v6M20 12v0" />
  </svg>
)

export const UploadCloudIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M7 18a4.5 4.5 0 0 1-1-8.9A5.5 5.5 0 0 1 17 8h.5a3.5 3.5 0 0 1 .5 7" />
    <path d="M12 12v7M9.5 16.5 12 14l2.5 2.5" />
  </svg>
)

export const SparklesIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
)

// ---- Added for Case Intelligence (investigation engine) ----

export const AlertTriangleIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M10.3 3.9 1.8 18a1.8 1.8 0 0 0 1.5 2.7h17.4a1.8 1.8 0 0 0 1.5-2.7L13.7 3.9a1.8 1.8 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
)

export const ArrowUpRightIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
)

export const TrendUpIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
  </svg>
)

export const TrendDownIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M3 7l6 6 4-4 8 8M15 17h6v-6" />
  </svg>
)

export const HelpCircleIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1.5 1-1.5 2.2M12 17h.01" />
  </svg>
)

export const MapPinIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
)

export const NetworkIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="5" r="2.5" />
    <circle cx="5" cy="19" r="2.5" />
    <circle cx="19" cy="19" r="2.5" />
    <path d="M12 7.5v4M10.3 13.6 6.8 17M13.7 13.6l3.5 3.4" />
  </svg>
)

export const ScaleIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3v18M6 7h12M6 7l-3 6a3 3 0 0 0 6 0l-3-6ZM18 7l-3 6a3 3 0 0 0 6 0l-3-6ZM8 21h8" />
  </svg>
)

export const HistoryIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5M12 7v5l4 2" />
  </svg>
)

export const LayersIcon = (p) => (
  <svg {...base} {...p}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5M3 8v5M21 8v5" />
  </svg>
)

export const RefreshIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8M21 4v4h-4" />
    <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16M3 20v-4h4" />
  </svg>
)

export const CheckIcon = (p) => (
  <svg {...base} {...p}>
    <path d="m5 12 5 5 9-9" />
  </svg>
)

export const XCircleIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </svg>
)

export const LinkIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M9.5 14.5 14.5 9.5" />
    <path d="M11 6.5 12.5 5a3.5 3.5 0 1 1 5 5L16 11.5" />
    <path d="M13 17.5 11.5 19a3.5 3.5 0 1 1-5-5L8 12.5" />
  </svg>
)

export const CameraIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 8a2 2 0 0 1 2-2h1.5l1-2h7l1 2H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
)

export const LogOutIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
)

export const MailIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
)

export const PhoneIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 4 6a2 2 0 0 1 2-2Z" />
  </svg>
)

export const EditIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)

export const BadgeIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5l-8-3Z" />
    <circle cx="12" cy="10" r="2.5" />
    <path d="M8.5 16c0-1.8 1.6-3 3.5-3s3.5 1.2 3.5 3" />
  </svg>
)

export const BuildingIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="4" y="3" width="16" height="18" rx="1" />
    <path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01" />
  </svg>
)

export const MapPinSmallIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
)

export const SaveIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M5 4h11l3 3v13H5V4Z" />
    <path d="M8 4v5h8V4M8 14h8v6H8v-6Z" />
  </svg>
)

export const TrashIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
  </svg>
)

export const LockIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
)

export const UserIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-3.9 3.6-7 8-7s8 3.1 8 7" />
  </svg>
)

// TRINETRA's brand mark — a wide-set "eye" (Sanskrit trinetra = "third eye").
export const EyeIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M2 12c2.4-4.2 6-6.5 10-6.5S19.6 7.8 22 12c-2.4 4.2-6 6.5-10 6.5S4.4 16.2 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
  </svg>
)

// Small shield-with-lock used as a "secure/authorized" footer marker.
export const ShieldLockIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5l-8-3Z" />
    <rect x="9.5" y="10.5" width="5" height="4" rx="1" />
    <path d="M10.5 10.5V9a1.5 1.5 0 0 1 3 0v1.5" />
  </svg>
)