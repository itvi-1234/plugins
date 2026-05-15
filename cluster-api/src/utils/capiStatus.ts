import { KubeObject } from '@kinvolk/headlamp-plugin/lib/K8s/cluster';
import { getPhaseStatus } from '../components/common/util';
import { Condition, getCondition } from '../resources/common';

export type GraphNodeStatus = 'error' | 'success' | 'warning';

/**
 * Minimal interface for a CAPI resource status.
 */
interface CapiStatus {
  conditions?: Condition[];
  phase?: string;
}

/**
 * Minimal interface for a CapiResource to be used in the map view.
 */
export interface CapiResource extends KubeObject {
  status?: CapiStatus;
}

/**
 * Derives an explicit GraphNodeStatus from a CAPI resource's conditions / phase.
 */
export function deriveCapiStatus(item: CapiResource): GraphNodeStatus | undefined {
  const conditions = item?.status?.conditions ?? [];

  // v1beta2
  const availableCond = getCondition(conditions, 'Available');
  if (availableCond) {
    return availableCond.status === 'True' ? 'success' : 'error';
  }

  // v1beta1
  const readyCond = getCondition(conditions, 'Ready');
  if (readyCond) {
    if (readyCond.status === 'True') return 'success';
    if (readyCond.status === 'False') return 'error';
    return 'warning';
  }

  // Phase-based fallback using the centralized utility function
  const phase: string | undefined = item?.status?.phase;
  const status = getPhaseStatus(phase);
  if (status) {
    return status as GraphNodeStatus;
  }

  return undefined;
}
