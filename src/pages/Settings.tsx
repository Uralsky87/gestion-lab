import { useRef, useState } from 'react'
import { exportBackup, importBackup, validateBackup } from '../data/backup'

export default function Settings() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isBusy, setIsBusy] = useState(false)

  const handleExport = async () => {
    setStatus('')
    setError('')
    setIsBusy(true)
    try {
      const payload = await exportBackup()
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `gestion-lab-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      setStatus('Backup exportado correctamente.')
    } catch (err) {
      setError('No se pudo exportar el backup.')
    } finally {
      setIsBusy(false)
    }
  }

  const handleImport = async (file?: File | null) => {
    if (!file) return
    setStatus('')
    setError('')
    setIsBusy(true)
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      if (!validateBackup(payload)) {
        setError('El archivo no tiene un formato válido.')
        return
      }

      const confirmMessage =
        mode === 'replace'
          ? 'Esto reemplazará todos los datos locales. ¿Continuar?'
          : 'Se mezclarán los datos sin duplicar IDs. ¿Continuar?'

      const confirmed = window.confirm(confirmMessage)
      if (!confirmed) return

      await importBackup(payload, mode)
      setStatus('Backup importado correctamente.')
    } catch (err) {
      setError('No se pudo importar el backup.')
    } finally {
      setIsBusy(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <>
      <section className="card">
        <h3>Respaldo local</h3>
        <p>
          Exporta tus datos para guardarlos fuera del dispositivo o
          restaurarlos más adelante.
        </p>
        <div className="form-row">
          <label className="form-label" htmlFor="backupMode">
            Modo de importación
          </label>
          <select
            id="backupMode"
            className="form-input"
            value={mode}
            onChange={(event) =>
              setMode(event.target.value as 'merge' | 'replace')
            }
          >
            <option value="merge">Merge (sin duplicar IDs)</option>
            <option value="replace">Replace (borrar y reemplazar)</option>
          </select>
        </div>
        <div className="form-actions">
          <button
            className="primary-button"
            type="button"
            onClick={handleExport}
            disabled={isBusy}
          >
            Exportar backup
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
          >
            Importar backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={(event) => handleImport(event.target.files?.[0])}
            hidden
          />
        </div>
        {status ? <div className="form-success">{status}</div> : null}
        {error ? <div className="form-error">{error}</div> : null}
      </section>
    </>
  )
}
