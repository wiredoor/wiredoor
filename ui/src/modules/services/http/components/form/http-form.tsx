import React from 'react';
import { useNavigate } from 'react-router-dom';

import { AppFormContainer } from '@/modules/shared/components/app-form-container';
import { NodeFormFields } from './node-form-fields';

import { getNode, mapToFormValues } from '@/modules/nodes/api/get-node';
import { createNode } from '@/modules/nodes/api/create-node';
import { updateNode } from '@/modules/nodes/api/update-node';

export function NodeForm({ nodeId }: { nodeId?: string }) {
  const navigate = useNavigate();

  const onSuccess = async ({ id, result }: { id?: number; result: any }) => {
    navigate('/services/http');
  };

  return (
    <AppFormContainer<CreateNodeType, any>
      id={nodeId}
      schema={createNodeValidator}
      get={(id) => getNode(id)}
      mapToFormValues={mapToFormValues}
      create={createNode}
      update={(id, values) => updateNode(id, values)}
      onSuccess={onSuccess}
      onCancel={() => navigate('/services/http')}
      render={({ form, shake }) => <NodeFormFields form={form} id={nodeId} shake={shake} onCancel={() => navigate('/services/http')} />}
    />
  );
}
