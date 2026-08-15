import { useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Sidebar from './components/Sidebar/Sidebar'
import TopNav from './components/TopNav/TopNav'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import NewCase from './pages/NewCase'
import CaseDetails from './pages/CaseDetails'
import AIInvestigation from './pages/AIInvestigation'
import PlaceholderPage from './pages/PlaceholderPage'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import styles from './App.module.css'

function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className={styles.shell}>
      <div className={styles.backdrop} aria-hidden="true" />

      <Sidebar isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className={styles.main}>
        <TopNav
          onMenuClick={() => setDrawerOpen(true)}
          notificationCount={3}
          onNewCase={() => navigate('/new-case')}
        />

        <div className={styles.content}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cases" element={<PlaceholderPage title="Cases" description="Full case list, filters and bulk actions land here." />} />
            <Route path="/cases/:caseId" element={<CaseDetails />} />
            <Route path="/cases/:caseId/investigation" element={<AIInvestigation />} />
            <Route path="/new-case" element={<NewCase />} />
            <Route path="/analysis" element={<PlaceholderPage title="Analysis" description="AI reasoning output — risk scoring, timelines and recommendations." />} />
            <Route path="/reports" element={<PlaceholderPage title="Reports" description="Generated investigation reports, ready to export." />} />
            <Route path="/settings" element={<PlaceholderPage title="Settings" description="Workspace, notification and account preferences." />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
