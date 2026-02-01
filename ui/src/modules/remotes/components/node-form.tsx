import React from 'react';
import { useNavigate } from 'react-router-dom';

import { AppFormContainer } from '@/modules/shared/components/app-form-container';
import { NodeFormFields } from './node-form-fields';

import { NodeForm, nodeValidator } from '../validators/node-validator';
import { nodeById, mapToFormValues } from '../api/get-node';
import { createNode } from '../api/create-node';
import { updateNode } from '../api/update-node';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateResourceFamily } from '@/lib/react-query';

export function RemoteForm({ nodeId }: { nodeId?: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const onSuccess = () => {
    if (nodeId) {
      invalidateResourceFamily(qc, `/api/nodes/${nodeId}/`);
    }
    invalidateResourceFamily(qc, '/api/nodes/');
    navigate('/nodes');
  };

  return (
    <AppFormContainer<NodeForm, any>
      id={nodeId}
      schema={nodeValidator}
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
