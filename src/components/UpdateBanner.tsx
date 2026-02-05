import { useEffect, useState } from 'react'

type UpdateDetail = {
  updateSW: (reload?: boolean) => Promise<void>
}

export default function UpdateBanner() {
  const [visible, setVisible] = useState(false)
  const [updateSW, setUpdateSW] = useState<UpdateDetail['updateSW'] | null>(null)

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<UpdateDetail>
      if (customEvent.detail?.updateSW) {
        setUpdateSW(() => customEvent.detail.updateSW)
        setVisible(true)
      }
    }

    window.addEventListener('pwa-update-available', handler)
    return () => window.removeEventListener('pwa-update-available', handler)
  }, [])

  const handleUpdate = async () => {
    if (!updateSW) return
    await updateSW(true)
  }

  if (!visible) return null

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <div>
        <strong>Nueva versión disponible.</strong>
        <span> Actualiza para tener los últimos cambios.</span>
      </div>
      <div className="update-actions">
        <button className="primary-button" type="button" onClick={handleUpdate}>
          Actualizar
        </button>
        <button
          className="ghost-button"
          type="button"
          onClick={() => setVisible(false)}
        >
          Ahora no
        </button>
      </div>
    </div>
  )
}
