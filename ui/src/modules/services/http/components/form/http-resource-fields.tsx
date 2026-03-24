import React from 'react';
import { useFieldArray, useWatch } from 'react-hook-form';
import { useForm } from '@/hooks/use-form';

import { Form, FormField, NumberField, SwitchField, TextField } from '@/components/compound/form';
import { Icon, Inline, Stack, Surface } from '@/components/foundations';
import { Button } from '@/components/ui/button';

function PanelSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className='py-5'>
      <div className='text-sm font-medium'>{title}</div>
      {description ? <div className='mt-1 text-xs text-muted-foreground'>{description}</div> : null}
      <div className='mt-4'>{children}</div>
    </div>
  );
}

function SettingsRow({
  title,
  description,
  control,
  open,
  children,
}: {
  title: string;
  description?: string;
  control: React.ReactNode;
  open?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className='py-5'>
      <div className='flex items-start justify-between gap-6'>
        <div className='min-w-0'>
          <div className='text-sm font-medium'>{title}</div>
          {description ? <div className='mt-1 text-xs text-muted-foreground'>{description}</div> : null}
        </div>
        <div className='shrink-0'>{control}</div>
      </div>

      {open && children ? children : null}
    </div>
  );
}

type NodeFormFieldsProps = {
  id?: string | number;
  form: ReturnType<typeof useForm<any>>;
  shake: boolean;
  onCancel: () => void;
};

export function HttpResourceFields({ id, form, shake, onCancel }: NodeFormFieldsProps) {
  const isEdit = Boolean(id);

  const isAdvanced = useWatch({ control: form.control, name: 'advanced' });
  const isGateway = useWatch({ control: form.control, name: 'isGateway' });
  const allowInternet = useWatch({ control: form.control, name: 'allowInternet' });

  const networks = useFieldArray({
    control: form.control,
    name: 'gatewayNetworks',
  });

  React.useEffect(() => {
    if (isGateway) {
      if (networks.fields.length === 0) networks.append({ interface: 'eth0', subnet: '' });
    } else {
      if (networks.fields.length > 0) networks.remove();
      form.clearErrors('gatewayNetworks');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGateway]);

  const addNetwork = () => {
    const nextIndex = networks.fields.length;
    networks.append({ interface: `eth${nextIndex}`, subnet: '' });
  };

  const showAddress = Boolean(form.getValues('address'));
  return (
    <Form form={form}>
      <div className='mx-auto w-full max-w-3xl px-4 py-6'>
        <Surface elevation='sm' radius='lg' className='overflow-hidden'>
          <div className='px-6 divide-y'>
            {form.formState.errors.root?.message ? (
              <div className='py-5'>
                <Surface elevation='sm' radius='md' className='p-4 border border-destructive' data-shake={shake}>
                  <Inline gap={2} align='center'>
                    <Icon name='info' className='text-destructive' />
                    <div className='text-sm'>{form.formState.errors.root.message}</div>
                  </Inline>
                </Surface>
              </div>
            ) : null}

            <PanelSection title='Node details' description='Basic information to identify and reach this node.'>
              <Stack gap={4}>
                <TextField form={form} name='name' label='Name' placeholder='prod-us-east-1' />

                {showAddress ? <TextField form={form} name='address' label='Address' placeholder='IP Address used by Wiredoor Network' /> : null}
              </Stack>
            </PanelSection>

            <SettingsRow
              title='Enable gateway mode'
              description='Route private subnets through this node.'
              open={isGateway}
              control={
                <SwitchField
                  form={form}
                  name='isGateway'
                  label={<span className='sr-only'>Enable gateway mode</span>}
                  className='flex-row-reverse justify-between'
                />
              }
            >
              <div className='mt-4 rounded-lg border bg-muted/30 p-4'>
                <Stack gap={3}>
                  <Inline justify='between' align='center'>
                    <div className='text-xs text-muted-foreground'>
                      Add subnets reachable behind this node. Use CIDR (e.g. 10.0.0.0/24). Max 4 interfaces.
                    </div>
                    <div className='text-xs text-muted-foreground'>{networks.fields.length}/4</div>
                  </Inline>

                  <FormField form={form} name='gatewayNetworks'>
                    <Stack gap={2}>
                      {networks.fields.map((field, index) => (
                        <Inline key={field.id} gap={3} align='start'>
                          <TextField
                            form={form}
                            className='w-28'
                            name={`gatewayNetworks.${index}.interface`}
                            label={index === 0 ? 'Interface' : undefined}
                            placeholder={`eth${index}`}
                          />

                          <div className='flex-1 w-full'>
                            <TextField
                              form={form}
                              name={`gatewayNetworks.${index}.subnet`}
                              label={index === 0 ? 'Subnet (CIDR)' : undefined}
                              placeholder='192.168.1.0/24'
                            />
                          </div>

                          <Button
                            type='button'
                            variant='ghost'
                            size='icon-sm'
                            disabled={networks.fields.length === 1}
                            onClick={() => networks.remove(index)}
                            aria-label='Remove interface'
                            className={index === 0 ? 'mt-8' : 'mt-0.5'}
                          >
                            <Icon name='close' className='text-muted-foreground hover:text-destructive' />
                          </Button>
                        </Inline>
                      ))}
                    </Stack>
                  </FormField>

                  <Inline justify='end'>
                    <Button type='button' variant='outline' size='sm' leadingIcon='plus' disabled={networks.fields.length >= 4} onClick={addNetwork}>
                      Add interface
                    </Button>
                  </Inline>
                </Stack>
              </div>
            </SettingsRow>

            <SettingsRow
              title='Route all internet traffic through Wiredoor'
              description='Send all node internet traffic through Wiredoor.'
              open={allowInternet}
              control={
                <SwitchField
                  form={form}
                  name='allowInternet'
                  label={<span className='sr-only'>Route all internet traffic through Wiredoor</span>}
                  className='flex-row-reverse justify-between'
                />
              }
            >
              {allowInternet && (
                <div className='flex gap-3 p-3 bg-warning/10 border border-warning/30 rounded-md mt-3'>
                  <Icon name='warning' className='w-4 h-4 text-warning flex-shrink-0 mt-0.5' />
                  <div className='text-xs text-muted-foreground'>
                    <strong className='text-foreground font-medium'>Not recommended for production environments.</strong>
                    <br />
                    Routing all internet traffic through Wiredoor may introduce latency and impact performance. Only enable this if your use case
                    requires it.
                  </div>
                </div>
              )}
            </SettingsRow>

            {/* Advanced */}
            <SettingsRow
              title='Advanced settings'
              description='Optional networking parameters for expert configurations.'
              open={isAdvanced}
              control={
                <SwitchField
                  form={form}
                  name='advanced'
                  label={<span className='sr-only'>Advanced settings</span>}
                  className='flex-row-reverse justify-between'
                />
              }
            >
              <div className='mt-4 rounded-lg border bg-muted/30 p-4'>
                <Stack gap={4}>
                  <TextField
                    form={form}
                    name='dns'
                    label='DNS'
                    placeholder='8.8.8.8, 8.8.4.4'
                    description='Comma-separated list of DNS servers used while connected.'
                  />

                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <NumberField
                      form={form}
                      name='mtu'
                      label='MTU (Maximum Transmission Unit)'
                      placeholder='1420'
                      description='The maximum packet size for this connection. Default is 1420 bytes.'
                    />

                    <NumberField
                      form={form}
                      name='keepalive'
                      label='Persistent Keepalive'
                      placeholder='25'
                      description='Interval in seconds for sending keep-alive packets. Default is 25 seconds. Set to 0 to disable.'
                    />
                  </div>
                </Stack>
              </div>
            </SettingsRow>
          </div>

          {/* Footer */}
          <div className='px-6 py-4 border-t bg-background/60'>
            <Inline justify='between' align='center'>
              <div className='text-xs text-muted-foreground'>{isEdit && form.formState.isDirty ? 'Unsaved changes' : ' '}</div>

              <Inline gap={2}>
                <Button type='button' variant='ghost' onClick={onCancel}>
                  Cancel
                </Button>
                <Button type='submit' shake={shake} loadingText='submitting...' isLoading={form.formState.isSubmitting}>
                  {isEdit ? 'Save changes' : 'Create node'}
                </Button>
              </Inline>
            </Inline>
          </div>
        </Surface>
      </div>
    </Form>
  );
}
