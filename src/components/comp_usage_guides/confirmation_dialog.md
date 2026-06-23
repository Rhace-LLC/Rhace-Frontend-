#### Usage Guide - Confirmation Dialog Component.

```tsx
import { useState } from 'react';
import { ConfirmationDialog } from './ConfirmationDialog';

export default function ExamplePage() {
  const [isOpen, setIsOpen] = useState(false);

  const handleActionConfirm = () => {
    console.log('Action Executed Successfully!');
    // Your delete/save logic here
  };

  const handleActionCancel = () => {
    console.log('Action Aborted.');
  };

  return (
    <div className="p-8 flex gap-4">
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-neutral-900 text-white rounded-md text-sm font-medium hover:bg-neutral-800"
      >
        Trigger Danger Modal
      </button>

      <ConfirmationDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        variant="danger" // Can be "success", "warning", or "danger"
        title="Delete Workspace?"
        confirmationMsg="Are you sure you want to delete this workspace? This action is permanent and cannot be undone. All associated data will be wiped."
        onConfirm={handleActionConfirm}
        onCancel={handleActionCancel}
      />
    </div>
  );
}
```
