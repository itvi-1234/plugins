export const volcanoJobApiGroup = 'batch.volcano.sh';
export const volcanoSchedulingApiGroup = 'scheduling.volcano.sh';

export function isApiVersionInGroup(apiVersion: string | undefined, apiGroup: string) {
  return apiVersion?.startsWith(`${apiGroup}/`) || false;
}

export function isVolcanoJobApiVersion(apiVersion: string | undefined) {
  return isApiVersionInGroup(apiVersion, volcanoJobApiGroup);
}

export function isVolcanoPodGroupApiVersion(apiVersion: string | undefined) {
  return isApiVersionInGroup(apiVersion, volcanoSchedulingApiGroup);
}
