import type { HTMLAttributes } from "react";

type IconProps = HTMLAttributes<SVGElement> & { size?: number };

function BaseIcon({ size = 18, ...props }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props} />;
}

export function SparkleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M5 15l.8 2L8 18l-2.2 1L5 21l-.8-2L2 18l2.2-1L5 15z" stroke="currentColor" strokeWidth="1.2" />
    </BaseIcon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </BaseIcon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </BaseIcon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="0.8" fill="currentColor" />
    </BaseIcon>
  );
}

export function TaskIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="5.5" y="7" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 10h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8.5 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </BaseIcon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4.5" y="6" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 10h15" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 4.5v3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 4.5v3" stroke="currentColor" strokeWidth="1.5" />
    </BaseIcon>
  );
}

export function NoteIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 5.5h7.5L19 10v8.5H7z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14.5 5.5V10h4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 16h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </BaseIcon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M12 9.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6.7 9.3l-1.3-.8 1.3-2.2 1.3.8a5.7 5.7 0 011.8-.7l.3-1.5h2.6l.3 1.5c.6.1 1.3.4 1.8.7l1.3-.8 1.3 2.2-1.3.8c.1.3.2.7.2 1.2 0 .4-.1.8-.2 1.2l1.3.8-1.3 2.2-1.3-.8c-.5.3-1.2.6-1.8.7l-.3 1.5H9.8l-.3-1.5a5.7 5.7 0 01-1.8-.7l-1.3.8-1.3-2.2 1.3-.8a3.7 3.7 0 01-.2-1.2c0-.5.1-.9.2-1.2z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8.5 12h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 17h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </BaseIcon>
  );
}

export function XIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </BaseIcon>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M6 7.5h12a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5h-5l-3.5 3v-3H6A1.5 1.5 0 014.5 15V9A1.5 1.5 0 016 7.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="11.5" r="0.8" fill="currentColor" />
      <circle cx="12" cy="11.5" r="0.8" fill="currentColor" />
      <circle cx="15" cy="11.5" r="0.8" fill="currentColor" />
    </BaseIcon>
  );
}
