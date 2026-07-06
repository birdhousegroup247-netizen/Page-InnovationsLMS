import logoDark from '../../assets/logo.png';       // black text — LIGHT surfaces
import logoLight from '../../assets/logo-white.png'; // white text — DARK surfaces
import { cn } from '../../utils/cn';

/**
 * Page Innovations wordmark.
 *   variant="auto"  (default) → black in light mode, white in dark mode
 *   variant="white"           → always white (use on coloured/gradient panels)
 *   variant="black"           → always black
 * Size via className, e.g. "h-8 w-auto".
 */
export default function Logo({ className = 'h-8 w-auto', alt = 'Page Innovations', variant = 'auto' }) {
  if (variant === 'white') return <img src={logoLight} alt={alt} className={cn(className, 'object-contain')} />;
  if (variant === 'black') return <img src={logoDark} alt={alt} className={cn(className, 'object-contain')} />;
  return (
    <>
      <img src={logoDark} alt={alt} className={cn(className, 'block dark:hidden object-contain')} />
      <img src={logoLight} alt={alt} className={cn(className, 'hidden dark:block object-contain')} />
    </>
  );
}
