import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFieldArray, useWatch } from 'react-hook-form';

import { FormField, NumberField, SwitchField, TextField } from '@/components/compound/form';
import { Icon, Inline, Stack, Surface } from '@/components/foundations';
import { useForm } from '@/hooks/use-form';
import { useShake } from '@/hooks/use-shake';
import { NodeForm, nodeValidator } from '../validators/node-validator';
import { createNode } from '../api/create-node';
import { Button } from '@/components/ui';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';

export function RemoteForm({ nodeId }: { nodeId?: string }) {
  const navigate = useNavigate();
  const isEdit = Boolean(nodeId);

  const { shake, triggerShake } = useShake();

  // const [isDirty, setIsDirty] = React.useState(false);
  // useUnsavedChanges(isDirty, {
  //   message: 'You have unsaved changes. Are you sure you want to leave this page?',
  // });

  const form = useForm<NodeForm>({
    mode: 'onSubmit',
    schema: nodeValidator,
    // shouldUnregister: true,
    onSubmit: async function (values: NodeForm): Promise<any> {
      await createNode(values);
      // setIsDirty(false);
      navigate('/nodes');
    },
    onError: (errors) => {
      console.log('RemoteForm errors:', errors);
      form.setError('root', { message: 'Invalid credentials.' });
      triggerShake();
    },
  });

  const isAdvanced = useWatch({ control: form.control, name: 'advanced' });
  const isGateway = useWatch({ control: form.control, name: 'isGateway' });

  const networks = useFieldArray({
    control: form.control,
    name: 'gatewayNetworks',
  });

  React.useEffect(() => {
    if (isGateway) {
      if (networks.fields.length === 0) {
        networks.append({ interface: 'eth0', subnet: '' });
      }
    } else {
      if (networks.fields.length > 0) {
        networks.remove();
      }
      form.clearErrors('gatewayNetworks');
    }
  }, [isGateway]);

  // React.useEffect(() => {
  //   setIsDirty(form.formState.isDirty);
  // }, [form.formState.isDirty]);

  const addNetwork = () => {
    const nextIndex = networks.fields.length;
    networks.append({ interface: `eth${nextIndex}`, subnet: '' });
  };

  return (
    <form onSubmit={form.handleSubmit} noValidate>
      <Stack gap={6}>
        {form.formState.errors.root?.message ? (
          <Surface elevation='sm' radius='md' className='p-4 border border-destructive' data-shake={shake}>
            <Inline gap={2} align='center'>
              <Icon name='info' className='text-destructive' />
              <div className='text-sm'>{form.formState.errors.root.message}</div>
            </Inline>
          </Surface>
        ) : null}

        <Surface elevation='sm' radius='md' className='p-6'>
          <Stack gap={4}>
            <Inline justify='between' align='center'>
              <div>
                <div className='text-sm font-medium'>Node details</div>
                <div className='text-xs text-muted-foreground'>Basic information to identify and reach this node.</div>
              </div>
            </Inline>

            <TextField form={form} name='name' label='Name' placeholder='Enter a friendly name for this node' />

            {form.getValues('address') ? (
              <TextField form={form} name='address' label='Address' placeholder='IP Address used by Wiredoor Network' />
            ) : null}
          </Stack>
        </Surface>

        <Surface elevation='sm' radius='md' className='p-6'>
          <Stack gap={4}>
            <SwitchField
              form={form}
              name='isGateway'
              label={
                <span className='block'>
                  <span className='block text-sm font-medium'>Enable network gateway mode</span>
                  <span className='block text-xs text-muted-foreground'>Route subnets through this node.</span>
                </span>
              }
              className='flex-row-reverse justify-between'
            />

            {isGateway ? (
              <Stack gap={4}>
                <FormField form={form} name='gatewayNetworks'>
                  <Stack gap={2}>
                    {networks.fields.map((field, index) => (
                      <Inline key={field.id} gap={3} align='end'>
                        <TextField
                          form={form}
                          className='w-24'
                          name={`gatewayNetworks.${index}.interface`}
                          label={index === 0 ? 'Interface' : undefined}
                          placeholder={`eth${index}`}
                        />

                        <div className='flex-1'>
                          <TextField
                            form={form}
                            name={`gatewayNetworks.${index}.subnet`}
                            label={index === 0 ? 'Subnet (CIDR)' : undefined}
                            placeholder='192.168.1.0/24'
                          />
                        </div>

                        <Button
                          className='mb-1'
                          type='button'
                          variant='ghost'
                          size='icon-sm'
                          disabled={networks.fields.length === 1}
                          onClick={() => networks.remove(index)}
                          aria-label='Remove interface'
                        >
                          <Icon className='text-destructive' name='close' />
                        </Button>
                      </Inline>
                    ))}
                  </Stack>
                </FormField>

                <Inline justify='end'>
                  <Button type='button' variant='outline' size='sm' leadingIcon='plus' disabled={networks.fields?.length === 4} onClick={addNetwork}>
                    Add interface
                  </Button>
                </Inline>
              </Stack>
            ) : null}
          </Stack>
        </Surface>

        <Surface elevation='sm' radius='md' className='p-6'>
          <SwitchField
            form={form}
            name='allowInternet'
            label={
              <span className='block'>
                <span className='block text-sm font-medium'>Remote Node Internet Connectivity</span>
                <span className='block text-xs text-muted-foreground'>Send all node internet traffic through the VPN.</span>
              </span>
            }
            className='flex-row-reverse justify-between'
          />
        </Surface>

        <Surface elevation='sm' radius='md' className='p-6'>
          <Stack gap={4}>
            <SwitchField
              form={form}
              name='advanced'
              label={
                <span className='block'>
                  <span className='block text-sm font-medium'>Advanced</span>
                  <span className='block text-xs text-muted-foreground'>Optional networking parameters.</span>
                </span>
              }
              className='flex-row-reverse justify-between'
            />

            {isAdvanced ? (
              <Stack gap={4}>
                <TextField form={form} name='dns' label='DNS (optional)' placeholder='1.1.1.1' description='DNS server used while connected.' />

                <Inline gap={4} className='flex-col sm:flex-row'>
                  <NumberField form={form} name='mtu' label='MTU (optional)' placeholder='1420' description='Maximum Transmission Unit in bytes.' />

                  <NumberField
                    form={form}
                    name='keepalive'
                    label='Persistent Keepalive'
                    placeholder='25'
                    description='Seconds. Use 0 to disable. Default: 25.'
                  />
                </Inline>
              </Stack>
            ) : null}
          </Stack>
        </Surface>

        <Inline justify='end' gap={2} className='pt-2'>
          <Button type='button' variant='ghost' onClick={() => navigate('/nodes')}>
            Cancel
          </Button>
          <Button type='submit' shake={shake}>
            Create node
          </Button>
        </Inline>
      </Stack>
    </form>
  );
}
