import { useState } from 'react';
import { Icon, Inline, Stack, Text } from '@/components/foundations';
import { TextField } from '@/components/compound/form';
import { Button } from '@/components/ui';
import { useForm } from '../../../../hooks/use-form';

interface TokenSectionProps {
  token: string;
  expiresIn?: string;
}

export function TokenSection({ token, expiresIn = '6 hours' }: TokenSectionProps) {
  const [copied, setCopied] = useState(false);

  const form = useForm({
    defaultValues: { token },
    onSubmit: function (values: { token: string }): Promise<void> {
      void values;
      return Promise.resolve();
    },
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Stack gap={4} className='w-full'>
      <Inline gap={3} align='start'>
        <div className='p-2 bg-primary/10 rounded-lg'>
          <Icon name='key' className='w-5 h-5 text-primary' />
        </div>
        <div className='flex-1'>
          <Text variant='body-sm' as='h3' className='mb-1'>
            Authentication Token
          </Text>
          <Text variant='caption' className='text-muted-foreground'>
            Generate a token to securely connect your node to the platform.
          </Text>
        </div>
      </Inline>

      <TextField
        form={form}
        name='token'
        readOnly
        trailing={
          <Button variant='ghost' size='sm' onClick={handleCopy}>
            {copied ? (
              <span className='flex items-center gap-1.5 text-success'>
                <Icon name='copyCheck' className='w-3.5 h-3.5' /> Copied!
              </span>
            ) : (
              <span className='flex items-center gap-1.5 text-primary'>
                <Icon name='copy' className='w-3.5 h-3.5' /> Copy
              </span>
            )}
          </Button>
        }
        trailingInteractive
      />

      {expiresIn && (
        <div className='flex gap-3 p-3 bg-warning/10 border border-warning/30 rounded-md mt-3'>
          <Icon name='warning' className='w-4 h-4 text-warning flex-shrink-0 mt-0.5' />
          <div className='text-xs text-muted-foreground'>
            <strong className='text-foreground font-medium'>This token is shown only once</strong>
            <br />
            The token will expire in <strong>{expiresIn}</strong> and must be used within that time to authenticate the node. If it expires, you can
            regenerate a new token.
          </div>
        </div>
      )}
    </Stack>
  );
}
