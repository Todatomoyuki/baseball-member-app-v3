type Props = {
  label?: string;
};

export function LoadingState({
  label = "読み込んでいます…",
}: Props) {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <div className="app-loading-spinner" aria-hidden="true" />

      <p>{label}</p>
    </div>
  );
}