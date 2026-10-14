import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { toast } from 'react-hot-toast';

interface ComingSoonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  feature: string;
}

export function ComingSoonButton({
  children,
  feature,
  className = '',
  ...props
}: ComingSoonButtonProps) {
  return (
    <button
      {...props}
      className={className}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) toast(`${feature} will be available in a later phase.`);
      }}
      type={props.type ?? 'button'}
      title={`${feature} will be implemented in a later phase`}
    >
      {children}
    </button>
  );
}
