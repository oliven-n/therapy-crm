'use client'

import { removeStaff } from '@/app/actions'

export function RemoveStaffButton({ id, email }: { id: string; email: string }) {
  return (
    <form
      action={removeStaff}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Remove ${email}?\n\nThey will be signed out immediately and unable to sign in again. ` +
              `Their past changes stay in the history under their name.`
          )
        ) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-xs font-medium text-red-700 hover:underline">
        Remove
      </button>
    </form>
  )
}
