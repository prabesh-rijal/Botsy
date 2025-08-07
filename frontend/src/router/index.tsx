// src/router/index.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Login from "@/pages/login"
import Signup from "@/pages/signup"
import Dashboard from "@/pages/dashboard"
import TestBot from "@/pages/test-bot"
import EditBot from "@/pages/edit-bot"
import Embed from "@/pages/embed"
import Profile from "@/pages/profile"

export default function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/test-bot" element={<TestBot />} />
        <Route path="/edit-bot" element={<EditBot />} />
        <Route path="/embed" element={<Embed />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Router>
  )
}
