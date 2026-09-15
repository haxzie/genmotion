import { cx } from "@/components/ui";

/** One card on a settings page. */
export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-surface-raised p-5">
      <h2 className="text-[1.05rem] font-medium text-text-primary">{title}</h2>
      {description && (
        <p className="mt-1 text-[0.857rem] leading-snug text-text-tertiary">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** A row of mutually exclusive choices, styled like the editor's segmented tabs. */
export function Choices<T>({
  options,
  isActive,
  onPick,
  label,
}: {
  options: T[];
  isActive: (option: T) => boolean;
  onPick: (option: T) => void;
  label: (option: T) => string;
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-background p-0.5">
      {options.map((option) => (
        <button
          key={label(option)}
          type="button"
          onClick={() => onPick(option)}
          aria-pressed={isActive(option)}
          className={cx(
            "rounded px-3 py-1 text-[0.857rem] transition-colors duration-150",
            "outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
            isActive(option)
              ? "bg-surface-hover text-text-primary"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          {label(option)}
        </button>
      ))}
    </div>
  );
}
