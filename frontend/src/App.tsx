import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { DEFAULT_FIELD_ID } from '@/config'
import { FieldPage } from '@/pages/FieldPage'
import { LifecyclesPage } from '@/pages/LifecyclesPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ShelfMapPage } from '@/pages/ShelfMapPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<ShelfMapPage />} />
        <Route path="fields" element={<Navigate to={`/fields/${DEFAULT_FIELD_ID}`} replace />} />
        <Route path="fields/:fieldId" element={<FieldPage />} />
        <Route path="lifecycles" element={<LifecyclesPage />} />
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
