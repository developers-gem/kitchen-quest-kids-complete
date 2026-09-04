interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

/** Renders any caught ApiError (or generic failure) consistently. Never
 * displays raw error.code strings to the user -- `message` is meant to be
 * the human-readable text already, since ApiError.message is populated
 * from the backend's own user-facing message field. */
export function ErrorState({ message = "Something went wrong.", onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-3xl bg-danger/10 p-6 text-center">
      <p className="font-semibold text-danger">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 min-h-11 rounded-full bg-danger px-5 py-2.5 font-semibold text-white"
        >
          Try again
        </button>
      )}
    </div>
  );
}
