// Confirmation dialogs for destructive or important actions (SweetAlert2)
import Swal from "sweetalert2";

export async function confirmAction(options: {
  title: string;
  text?: string;
  confirmText?: string;
  danger?: boolean;
}): Promise<boolean> {
  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    icon: options.danger ? "warning" : "question",
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? "Confirm",
    confirmButtonColor: options.danger ? "#dc2626" : "#00c853",
    reverseButtons: true,
  });
  return result.isConfirmed;
}

// Asks for a required reason, e.g. when rejecting. Returns null if cancelled.
export async function promptReason(options: {
  title: string;
  placeholder?: string;
  confirmText?: string;
}): Promise<string | null> {
  const result = await Swal.fire({
    title: options.title,
    input: "textarea",
    inputPlaceholder: options.placeholder ?? "Explain the reason...",
    inputAttributes: { "aria-label": options.title },
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? "Submit",
    confirmButtonColor: "#dc2626",
    reverseButtons: true,
    inputValidator: (value) => (!value?.trim() ? "A reason is required." : null),
  });
  return result.isConfirmed ? String(result.value).trim() : null;
}
