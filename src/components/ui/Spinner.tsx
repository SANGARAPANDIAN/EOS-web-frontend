import { useId } from "react";

interface SpinnerProps {
  /** Pixel size of the square viewport. */
  size?: number;
  className?: string;
  label?: string;
}

/**
 * A 3×3 grid of squares that collapse and swap corner-to-corner in a
 * staggered wave (SMIL `<animate>` chain) — reads as a considered, premium
 * loader rather than the flat single-color ring every UI kit ships by
 * default. Uses `currentColor` so a wrapping `text-*` class controls its
 * color. The two chained animation ids are namespaced per instance (via
 * `useId()`) so multiple simultaneous spinners never cross-reference each
 * other's `begin="otherId.end+…"` timing.
 */
export function Spinner({ size = 22, className, label = "Loading" }: SpinnerProps) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const a = `sqA${rawId}`;
  const b = `sqB${rawId}`;

  return (
    <svg
      role="status"
      aria-label={label}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <rect x="1" y="1" width="7.33" height="7.33">
        <animate id={a} begin={`0;${b}.end+0.2s`} attributeName="x" dur="0.6s" values="1;4;1" />
        <animate begin={`0;${b}.end+0.2s`} attributeName="y" dur="0.6s" values="1;4;1" />
        <animate begin={`0;${b}.end+0.2s`} attributeName="width" dur="0.6s" values="7.33;1.33;7.33" />
        <animate begin={`0;${b}.end+0.2s`} attributeName="height" dur="0.6s" values="7.33;1.33;7.33" />
      </rect>
      <rect x="8.33" y="1" width="7.33" height="7.33">
        <animate begin={`${a}.begin+0.1s`} attributeName="x" dur="0.6s" values="8.33;11.33;8.33" />
        <animate begin={`${a}.begin+0.1s`} attributeName="y" dur="0.6s" values="1;4;1" />
        <animate begin={`${a}.begin+0.1s`} attributeName="width" dur="0.6s" values="7.33;1.33;7.33" />
        <animate begin={`${a}.begin+0.1s`} attributeName="height" dur="0.6s" values="7.33;1.33;7.33" />
      </rect>
      <rect x="1" y="8.33" width="7.33" height="7.33">
        <animate begin={`${a}.begin+0.1s`} attributeName="x" dur="0.6s" values="1;4;1" />
        <animate begin={`${a}.begin+0.1s`} attributeName="y" dur="0.6s" values="8.33;11.33;8.33" />
        <animate begin={`${a}.begin+0.1s`} attributeName="width" dur="0.6s" values="7.33;1.33;7.33" />
        <animate begin={`${a}.begin+0.1s`} attributeName="height" dur="0.6s" values="7.33;1.33;7.33" />
      </rect>
      <rect x="15.66" y="1" width="7.33" height="7.33">
        <animate begin={`${a}.begin+0.2s`} attributeName="x" dur="0.6s" values="15.66;18.66;15.66" />
        <animate begin={`${a}.begin+0.2s`} attributeName="y" dur="0.6s" values="1;4;1" />
        <animate begin={`${a}.begin+0.2s`} attributeName="width" dur="0.6s" values="7.33;1.33;7.33" />
        <animate begin={`${a}.begin+0.2s`} attributeName="height" dur="0.6s" values="7.33;1.33;7.33" />
      </rect>
      <rect x="8.33" y="8.33" width="7.33" height="7.33">
        <animate begin={`${a}.begin+0.2s`} attributeName="x" dur="0.6s" values="8.33;11.33;8.33" />
        <animate begin={`${a}.begin+0.2s`} attributeName="y" dur="0.6s" values="8.33;11.33;8.33" />
        <animate begin={`${a}.begin+0.2s`} attributeName="width" dur="0.6s" values="7.33;1.33;7.33" />
        <animate begin={`${a}.begin+0.2s`} attributeName="height" dur="0.6s" values="7.33;1.33;7.33" />
      </rect>
      <rect x="1" y="15.66" width="7.33" height="7.33">
        <animate begin={`${a}.begin+0.2s`} attributeName="x" dur="0.6s" values="1;4;1" />
        <animate begin={`${a}.begin+0.2s`} attributeName="y" dur="0.6s" values="15.66;18.66;15.66" />
        <animate begin={`${a}.begin+0.2s`} attributeName="width" dur="0.6s" values="7.33;1.33;7.33" />
        <animate begin={`${a}.begin+0.2s`} attributeName="height" dur="0.6s" values="7.33;1.33;7.33" />
      </rect>
      <rect x="15.66" y="8.33" width="7.33" height="7.33">
        <animate begin={`${a}.begin+0.3s`} attributeName="x" dur="0.6s" values="15.66;18.66;15.66" />
        <animate begin={`${a}.begin+0.3s`} attributeName="y" dur="0.6s" values="8.33;11.33;8.33" />
        <animate begin={`${a}.begin+0.3s`} attributeName="width" dur="0.6s" values="7.33;1.33;7.33" />
        <animate begin={`${a}.begin+0.3s`} attributeName="height" dur="0.6s" values="7.33;1.33;7.33" />
      </rect>
      <rect x="8.33" y="15.66" width="7.33" height="7.33">
        <animate begin={`${a}.begin+0.3s`} attributeName="x" dur="0.6s" values="8.33;11.33;8.33" />
        <animate begin={`${a}.begin+0.3s`} attributeName="y" dur="0.6s" values="15.66;18.66;15.66" />
        <animate begin={`${a}.begin+0.3s`} attributeName="width" dur="0.6s" values="7.33;1.33;7.33" />
        <animate begin={`${a}.begin+0.3s`} attributeName="height" dur="0.6s" values="7.33;1.33;7.33" />
      </rect>
      <rect x="15.66" y="15.66" width="7.33" height="7.33">
        <animate id={b} begin={`${a}.begin+0.4s`} attributeName="x" dur="0.6s" values="15.66;18.66;15.66" />
        <animate begin={`${a}.begin+0.4s`} attributeName="y" dur="0.6s" values="15.66;18.66;15.66" />
        <animate begin={`${a}.begin+0.4s`} attributeName="width" dur="0.6s" values="7.33;1.33;7.33" />
        <animate begin={`${a}.begin+0.4s`} attributeName="height" dur="0.6s" values="7.33;1.33;7.33" />
      </rect>
    </svg>
  );
}
