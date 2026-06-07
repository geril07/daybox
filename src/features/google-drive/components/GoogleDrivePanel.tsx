import { Cloud, CloudOff, LogIn, Trash2 } from 'lucide-react'
import { useState } from 'react'

import {
  useAccountEmail,
  useIsConnected,
  useLastBackupAge,
} from '@/features/google-drive/queries'
import { useGoogleDriveStore } from '@/features/google-drive/store'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from '@/shared/ui'

export function GoogleDrivePanel() {
  const isConnected = useIsConnected()
  const email = useAccountEmail()
  const lastBackupAt = useLastBackupAge()
  const status = useGoogleDriveStore((s) => s.status)
  const error = useGoogleDriveStore((s) => s.error)
  const dayboxFileId = useGoogleDriveStore((s) => s.dayboxFileId)
  const connect = useGoogleDriveStore((s) => s.connect)
  const disconnect = useGoogleDriveStore((s) => s.disconnect)
  const backup = useGoogleDriveStore((s) => s.backup)
  const restore = useGoogleDriveStore((s) => s.restore)
  const clearError = useGoogleDriveStore((s) => s.clearError)

  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  const [warnings, setWarnings] = useState<string[] | null>(null)

  const clientConfigured = isClientConfigured()

  if (!clientConfigured) {
    return (
      <div className="text-muted-foreground flex flex-col gap-1 text-xs">
        <div className="flex items-center gap-1.5">
          <CloudOff className="size-3.5" />
          <span>Google Drive is not configured for this build.</span>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          onClick={() => void connect()}
          disabled={status === 'connecting'}
        >
          <LogIn className="size-3.5" />
          {status === 'connecting' ? 'Connecting...' : 'Connect with Google'}
        </Button>
        {error && error.kind === 'denied' && (
          <div className="text-muted-foreground text-xs">
            Sign-in cancelled.
          </div>
        )}
        {error && error.kind === 'script-load' && (
          <InlineError
            text="Could not load Google Identity Services."
            onDismiss={clearError}
          />
        )}
        {error && error.kind === 'network' && (
          <InlineError
            text={`Network error: ${error.message}`}
            onDismiss={clearError}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Cloud className="size-3.5" />
        {email ? <span>{email}</span> : <span>Connected</span>}
      </div>

      {lastBackupAt !== null && (
        <div className="text-muted-foreground text-xs">
          Last backup: {lastBackupAt}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Button
          variant="outline"
          onClick={() => void backup()}
          disabled={status === 'backing-up' || status === 'restoring'}
        >
          {status === 'backing-up' ? 'Backing up...' : 'Back up'}
        </Button>

        <AlertDialog
          open={restoreConfirmOpen}
          onOpenChange={(o) => {
            setRestoreConfirmOpen(o)
            if (!o) setWarnings(null)
          }}
        >
          <AlertDialogTrigger
            render={
              <Button
                variant="outline"
                disabled={
                  status === 'backing-up' ||
                  status === 'restoring' ||
                  !dayboxFileId
                }
              />
            }
          >
            Restore
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Restore from Google Drive</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all current data (tasks, groups, settings). This
              cannot be undone.
            </AlertDialogDescription>
            <div className="flex flex-col gap-2">
              <AlertDialogAction
                onClick={async () => {
                  setRestoreConfirmOpen(false)
                  const result = await restore()
                  if (result.ok && result.warnings?.length) {
                    setWarnings(result.warnings)
                  }
                }}
              >
                Continue
              </AlertDialogAction>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          variant="ghostDestructive"
          onClick={disconnect}
          disabled={status === 'backing-up' || status === 'restoring'}
        >
          <Trash2 className="size-3.5" />
          Disconnect
        </Button>
      </div>

      {warnings && warnings.length > 0 && (
        <div className="text-muted-foreground mt-1 flex flex-col gap-1 text-xs">
          {warnings.map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
      )}

      {error && error.kind === 'not-found' && (
        <InlineError
          text="No backup found on Google Drive."
          onDismiss={clearError}
        />
      )}
      {error && error.kind === 'network' && (
        <InlineError
          text={`Network error: ${error.message}`}
          onDismiss={clearError}
        />
      )}
      {error && error.kind === 'envelope' && (
        <InlineError text={error.message} onDismiss={clearError} />
      )}
      {error && error.kind === 'script-load' && (
        <InlineError
          text="Could not load Google Identity Services."
          onDismiss={clearError}
        />
      )}
    </div>
  )
}

function isClientConfigured(): boolean {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  return Boolean(id && id.length > 0)
}

function InlineError({
  text,
  onDismiss,
}: {
  text: string
  onDismiss: () => void
}) {
  return (
    <div className="text-destructive flex flex-col gap-1 text-xs">
      <span>{text}</span>
      <button
        type="button"
        className="self-start underline"
        onClick={onDismiss}
      >
        Dismiss
      </button>
    </div>
  )
}
