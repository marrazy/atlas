import { useEffect, useState } from 'react'

type Health = { status: string }

function App() {
  const [status, setStatus] = useState('Connecting...')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? (res.json() as Promise<Health>) : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => setStatus(data.status === 'ok' ? 'Ok' : 'Error'))
      .catch(() => setStatus('Disconnected'))
  }, [])

  return <h1>Status: {status}</h1>
}

export default App
