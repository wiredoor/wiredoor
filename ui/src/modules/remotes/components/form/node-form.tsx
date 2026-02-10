import React from 'react';
import { useNavigate } from 'react-router-dom';

import { AppFormContainer } from '@/modules/shared/components/app-form-container';
import { NodeFormFields } from './node-form-fields';

import { NodeForm, nodeValidator } from '@/modules/remotes/validators/node-validator';
import { nodeById, mapToFormValues } from '@/modules/remotes/api/get-node';
import { createNode } from '@/modules/remotes/api/create-node';
import { updateNode } from '@/modules/remotes/api/update-node';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateResourceFamily } from '@/lib/react-query';
import { NodeTokenDialog } from '../dialog/node-token-dialog';

export function RemoteForm({ nodeId }: { nodeId?: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const onSuccess = async ({ id, result }: { id?: number; result: any }) => {
    if (nodeId) {
      invalidateResourceFamily(qc, `/api/nodes/:id`);
    }
    navigate('/nodes');
    await NodeTokenDialog({
      name: result.name,
      token: result.token,
      showInstallInstructions: true,
    });
  };

  return (
    <AppFormContainer<NodeForm, any>
      id={nodeId}
      schema={nodeValidator}
      resetKey={`/api/nodes/${nodeId}/`}
      useGet={(id) => nodeById.useItem({ id })}
      mapToFormValues={mapToFormValues}
      create={createNode}
      update={(id, values) => updateNode(id, values)}
      onSuccess={onSuccess}
      onCancel={() => navigate('/nodes')}
      render={({ form, shake }) => <NodeFormFields form={form} id={nodeId} shake={shake} onCancel={() => navigate('/nodes')} />}
    />
  );
}
