import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import TacticalGame from './components/TacticalGame'

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <TacticalGame />
    </div>
  )
}

export default App