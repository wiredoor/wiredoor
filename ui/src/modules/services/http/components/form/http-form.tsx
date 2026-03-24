import React from 'react';
import { useNavigate } from 'react-router-dom';

import { AppFormContainer } from '@/modules/shared/components/app-form-container';
import { HttpResourceFields } from './http-resource-fields';

import { getNode, mapToFormValues } from '@/modules/nodes/api/get-node';
import { HttpResourceType, httpResourceValidator } from '../../http-resource-schemas';
import HttpResourceApiService from '../../api/http-resource-api-service';

export function HttpResourceForm({ resourceId }: { resourceId?: string }) {
  const navigate = useNavigate();

  const onSuccess = async ({ id, result }: { id?: number; result: any }) => {
    navigate('/services/http');
    if (id) return;
    void result;
  };

  return (
    <AppFormContainer<HttpResourceType, any>
      id={resourceId}
      schema={httpResourceValidator}
      get={(id) => getNode(id)}
      mapToFormValues={mapToFormValues}
      create={HttpResourceApiService.createHttpResource}
      update={(id, values) => HttpResourceApiService.updateHttpResource(id, values)}
      onSuccess={onSuccess}
      onCancel={() => navigate('/services/http')}
      render={({ form, shake }) => <HttpResourceFields form={form} id={resourceId} shake={shake} onCancel={() => navigate('/services/http')} />}
    />
  );
}
