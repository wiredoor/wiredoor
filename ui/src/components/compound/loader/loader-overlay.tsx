import { Loader2 } from 'lucide-react';

type LoaderOverlayProps = {
  loading?: boolean;
  text?: string;
};

export function LoaderOverlay({ loading = true, text = 'Loading...' }: LoaderOverlayProps) {
  if (!loading) return null;

  return (
    <div className='absolute inset-0 z-20 flex items-center justify-center'>
      <div className='absolute inset-0 rounded-md bg-background/40 backdrop-blur-[1px]' />

      <div className='relative z-10 flex items-center gap-3 rounded-xl border bg-card/90 px-4 py-3 shadow-sm'>
        <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
        <span className='text-sm text-muted-foreground'>{text}</span>
      </div>
    </div>
  );
}
