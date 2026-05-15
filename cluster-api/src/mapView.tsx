import { Icon } from '@iconify/react';
import { useMemo } from 'react';
import { ClusterClassDetail } from './components/clusterclasses/Detail';
import { ClusterDetail } from './components/clusters/Detail';
import { KubeadmConfigDetail } from './components/kubeadmconfigs/Detail';
import { KubeadmConfigTemplateDetail } from './components/kubeadmconfigtemplates/Detail';
import { KubeadmControlPlaneDetail } from './components/kubeadmcontrolplanes/Detail';
import { KubeadmControlPlaneTemplateDetail } from './components/kubeadmcontrolplanetemplates/Detail';
import { MachineDeploymentDetail } from './components/machinedeployments/Detail';
import { MachineDrainRuleDetail } from './components/machinedrainrules/Detail';
import { MachineHealthCheckDetail } from './components/machinehealthchecks/Detail';
import { MachinePoolDetail } from './components/machinepools/Detail';
import { MachineDetail } from './components/machines/Detail';
import { MachineSetDetail } from './components/machinesets/Detail';
import { Cluster } from './resources/cluster';
import { ClusterClass } from './resources/clusterclass';
import { KubeadmConfig } from './resources/kubeadmconfig';
import { KubeadmConfigTemplate } from './resources/kubeadmconfigtemplate';
import { KubeadmControlPlane } from './resources/kubeadmcontrolplane';
import { KubeadmControlPlaneTemplate } from './resources/kubeadmcontrolplanetemplate';
import { Machine } from './resources/machine';
import { MachineDeployment } from './resources/machinedeployment';
import { MachineDrainRule } from './resources/machinedrainrule';
import { MachineHealthCheck } from './resources/machinehealthcheck';
import { MachinePool } from './resources/machinepool';
import { MachineSet } from './resources/machineset';
import { deriveCapiStatus } from './utils/capiStatus';
import { useCapiApiVersion } from './utils/capiVersion';

/**
 * Map resource configuration
 */
interface MapResourceConfig {
  name: string;
  kind: string;
  path: string;
  DetailComponent: React.ComponentType<{ node?: any }>;
  icon: string;
  resourceClass: any;
}

/**
 * Cluster API resources to display in the map view
 */
const mapResources: MapResourceConfig[] = [
  {
    name: 'Clusters',
    kind: 'Cluster',
    path: 'capiclusters',
    DetailComponent: ClusterDetail,
    icon: 'mdi:cloud',
    resourceClass: Cluster,
  },
  {
    name: 'Cluster Classes',
    kind: 'ClusterClass',
    path: 'clusterclasses',
    DetailComponent: ClusterClassDetail,
    icon: 'mdi:cloud-print-outline',
    resourceClass: ClusterClass,
  },
  {
    name: 'Kubeadm Control Planes',
    kind: 'KubeadmControlPlane',
    path: 'kubeadmcontrolplanes',
    DetailComponent: KubeadmControlPlaneDetail,
    icon: 'mdi:controller-classic',
    resourceClass: KubeadmControlPlane,
  },
  {
    name: 'Kubeadm Control Plane Templates',
    kind: 'KubeadmControlPlaneTemplate',
    path: 'kubeadmcontrolplanetemplates',
    DetailComponent: KubeadmControlPlaneTemplateDetail,
    icon: 'mdi:controller-classic-outline',
    resourceClass: KubeadmControlPlaneTemplate,
  },
  {
    name: 'Machine Deployments',
    kind: 'MachineDeployment',
    path: 'machinedeployments',
    DetailComponent: MachineDeploymentDetail,
    icon: 'mdi:knob',
    resourceClass: MachineDeployment,
  },
  {
    name: 'Machine Pools',
    kind: 'MachinePool',
    path: 'machinepools',
    DetailComponent: MachinePoolDetail,
    icon: 'mdi:pool',
    resourceClass: MachinePool,
  },
  {
    name: 'Machine Sets',
    kind: 'MachineSet',
    path: 'machinesets',
    DetailComponent: MachineSetDetail,
    icon: 'mdi:set-split',
    resourceClass: MachineSet,
  },
  {
    name: 'Machines',
    kind: 'Machine',
    path: 'machines',
    DetailComponent: MachineDetail,
    icon: 'mdi:desktop-classic',
    resourceClass: Machine,
  },
  {
    name: 'Kubeadm Config Templates',
    kind: 'KubeadmConfigTemplate',
    path: 'kubeadmconfigtemplates',
    DetailComponent: KubeadmConfigTemplateDetail,
    icon: 'mdi:list-box-outline',
    resourceClass: KubeadmConfigTemplate,
  },
  {
    name: 'Kubeadm Configs',
    kind: 'KubeadmConfig',
    path: 'kubeadmconfigs',
    DetailComponent: KubeadmConfigDetail,
    icon: 'mdi:list-box',
    resourceClass: KubeadmConfig,
  },
  {
    name: 'Machine Health Checks',
    kind: 'MachineHealthCheck',
    path: 'machinehealthchecks',
    DetailComponent: MachineHealthCheckDetail,
    icon: 'mdi:bottle-tonic-plus',
    resourceClass: MachineHealthCheck,
  },
  {
    name: 'Machine Drain Rules',
    kind: 'MachineDrainRule',
    path: 'machinedrainrules',
    DetailComponent: MachineDrainRuleDetail,
    icon: 'mdi:vacuum-outline',
    resourceClass: MachineDrainRule,
  },
];

const STRUCTURAL_KINDS = new Set([
  'Cluster',
  'KubeadmControlPlane',
  'MachineDeployment',
  'MachinePool',
  'MachineSet',
  'Machine',
]);

const PARENT_WEIGHTS: Record<string, number> = {
  Cluster: 100,
  KubeadmControlPlane: 70,
  MachineDeployment: 70,
  MachinePool: 70,
};

/**
 * Creates a map source for a Cluster API resource
 */
function createCapiMapSource(r: MapResourceConfig) {
  const knownKinds = new Set(mapResources.map(res => res.kind));

  return {
    id: `cluster-api-${r.path}`,
    label: r.name,
    icon: <Icon icon={r.icon} width="100%" height="100%" color="rgb(50, 108, 229)" />,
    useData() {
      const apiVersion = useCapiApiVersion(r.resourceClass.crdName, 'v1beta1');
      const versionedClass = r.resourceClass.withApiVersion
        ? r.resourceClass.withApiVersion(apiVersion ?? 'v1beta1')
        : r.resourceClass;

      const [items] = versionedClass.useList();

      return useMemo(() => {
        const nodes = (items ?? []).map((it: any) => ({
          id: it.metadata.uid,
          kubeObject: it,
          detailsComponent: r.DetailComponent,
          status: deriveCapiStatus(it),
          weight: PARENT_WEIGHTS[r.kind] ?? 0, // Leaves are weightless
        }));

        const edges: Array<{
          id: string;
          source: string;
          target: string;
          label: string;
        }> = [];

        for (const it of items ?? []) {
          const refs = it.metadata?.ownerReferences;
          if (!refs) continue;

          refs.forEach((ownerRef: any) => {
            if (!knownKinds.has(ownerRef.kind)) return;
            const isStructural =
              STRUCTURAL_KINDS.has(ownerRef.kind) || STRUCTURAL_KINDS.has(r.kind);
            if (!isStructural) return;

            edges.push({
              id: `${ownerRef.uid}-${it.metadata.uid}`,
              source: ownerRef.uid,
              target: it.metadata.uid,
              label: `owned by ${ownerRef.kind}`,
            });
          });
        }

        return { nodes, edges };
      }, [items]);
    },
  };
}

export const clusterApiSource = {
  id: 'cluster-api',
  label: 'Cluster API',
  icon: <Icon icon="capi:logo" width="100%" height="100%" />,
  sources: mapResources.map(r => createCapiMapSource(r)),
};
