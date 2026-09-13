import type { ButtonHTMLAttributes } from 'react';
export function PrimaryButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`primary-button ${className}`} {...props} />;
}
