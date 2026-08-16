import { useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Sidebar from './components/Sidebar/Sidebar'
import TopNav from './components/TopNav/TopNav'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
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
