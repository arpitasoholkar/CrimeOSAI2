import { useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Sidebar from './components/Sidebar/Sidebar'
import TopNav from './components/TopNav/TopNav'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import TrinetraLoader from './components/loader/TrinetraLoader'
import Dashboard from './pages/Dashboard'
import Cases from './pages/Cases'
import NewCase from './pages/NewCase'
import CaseDetails from './pages/CaseDetails'
import MyCases from './pages/MyCases'
import CasesArchive from './pages/CasesArchive'
import AccessRequests from './pages/AccessRequests'
import AIInvestigation from './pages/AIInvestigation'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import MockBank from './pages/MockBank'
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
          onNewCase={() => navigate('/new-case')}
        />

        <div className={styles.content}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/cases/:caseId" element={<CaseDetails />} />
            <Route path="/cases/:caseId/investigation" element={<AIInvestigation />} />
            <Route path="/new-case" element={<NewCase />} />
            <Route path="/my-cases" element={<MyCases />} />
            <Route path="/cases-archive" element={<CasesArchive />} />
            <Route path="/access-requests" element={<AccessRequests />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  // Shown once at app boot — before the router decides whether to land on
  // /login or the dashboard. Covers every full page load/refresh, matching
  // the intended sequence: TRINETRA loader -> Login -> Dashboard.
  //
  // /mock-bank is a separate, unauthenticated persona (a bank compliance
  // officer, opened in its own tab with no login step) and isn't part of
  // the investigator app at all, so it skips the investigator-branded
  // boot sequence entirely.
  const [booting, setBooting] = useState(true)
  const isMockBank = window.location.pathname.startsWith('/mock-bank')

  if (booting && !isMockBank) {
    return <TrinetraLoader onComplete={() => setBooting(false)} />
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/mock-bank" element={<MockBank />} />
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