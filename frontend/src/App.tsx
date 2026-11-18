import { lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { DEFAULT_FIELD_ID } from '@/config'

// Each screen is built into its own file and downloaded the first time it is opened,
// so the charts and the map only load on the screens that use them.
const ShelfMapPage = lazy(() => import('@/pages/ShelfMapPage').then((m) => ({ default: m.ShelfMapPage })))
const FieldPage = lazy(() => import('@/pages/FieldPage').then((m) => ({ default: m.FieldPage })))
const LifecyclesPage = lazy(() => import('@/pages/LifecyclesPage').then((m) => ({ default: m.LifecyclesPage })))
const MethodsPage = lazy(() => import('@/pages/MethodsPage').then((m) => ({ default: m.MethodsPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<ShelfMapPage />} />
        <Route path="fields" element={<Navigate to={`/fields/${DEFAULT_FIELD_ID}`} replace />} />
        <Route path="fields/:fieldId" element={<FieldPage />} />
        <Route path="lifecycles" element={<LifecyclesPage />} />
        <Route path="methods" element={<MethodsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
