import React from 'react';
import { useNavigate } from 'react-router-dom';

import { AppFormContainer } from '@/modules/shared/components/app-form-container';
import { NodeFormFields } from './node-form-fields';

import { NodeForm, nodeValidator } from '../validators/node-validator';
import { nodeById, mapToFormValues } from '../api/get-node';
import { createNode } from '../api/create-node';
import { updateNode } from '../api/update-node';

export function RemoteForm({ nodeId }: { nodeId?: string }) {
  const navigate = useNavigate();

  return (
    <AppFormContainer<NodeForm, any>
      id={nodeId}
      schema={nodeValidator}
      useGet={(id) => nodeById.useItem({ id })}
      mapToFormValues={mapToFormValues}
      create={createNode}
      update={(id, values) => updateNode(id, values)}
      onSuccess={() => navigate('/nodes')}
      onCancel={() => navigate('/nodes')}
      render={({ form, shake }) => <NodeFormFields form={form} id={nodeId} shake={shake} onCancel={() => navigate('/nodes')} />}
    />
  );
}
