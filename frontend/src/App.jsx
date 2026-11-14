import { useEffect, useState } from 'react'

function App() {
  const [status, setStatus] = useState('Connecting...')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => setStatus(data.ok ? 'Ok' : 'Error'))
      .catch(() => setStatus('Disconnected'))
  }, [])

  return <h1>Status: {status}</h1>
}

export default App
