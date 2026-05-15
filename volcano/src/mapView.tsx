import { Icon } from '@iconify/react';
import { K8s } from '@kinvolk/headlamp-plugin/lib';
import type {
  GraphEdge,
  GraphNode,
} from '@kinvolk/headlamp-plugin/lib/components/resourceMap/graph/graphModel';
import type { KubeObject } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';
import type { ComponentType } from 'react';
import { useMemo } from 'react';
import JobDetail from './components/jobs/Detail';
import PodGroupDetail from './components/podgroups/Detail';
import QueueDetail from './components/queues/Detail';
import { VolcanoJob } from './resources/job';
import { VolcanoPodGroup } from './resources/podgroup';
import { VolcanoQueue } from './resources/queue';
import { getJobStatusColor, getPodGroupStatusColor, getQueueStatusColor } from './utils/status';
import { isVolcanoJobApiVersion } from './utils/volcanoApi';

const volcanoMapIcon = (
  <Icon icon="custom:volcano" width="100%" height="100%" color="rgb(229, 39, 25)" />
);

const PodResource = K8s.ResourceClasses.Pod;
const volcanoJobNameLabel = 'volcano.sh/job-name';
const volcanoJobNamespaceLabel = 'volcano.sh/job-namespace';

type GraphNodeStatus = 'error' | 'success' | 'warning';
type GraphDetailsComponentProps = { node: GraphNode };
type VolcanoOwnerReference = {
  apiVersion?: string;
  kind?: string;
  uid?: string;
};
type VolcanoMapKubeObject = KubeObject & {
  metadata: {
    uid: string;
    ownerReferences?: VolcanoOwnerReference[];
  };
};

function isVolcanoJobOwnerReference(ownerReference: VolcanoOwnerReference) {
  return ownerReference.kind === 'Job' && isVolcanoJobApiVersion(ownerReference.apiVersion);
}

function referencesVolcanoJob(ownerReference: VolcanoOwnerReference, job: VolcanoJob) {
  return isVolcanoJobOwnerReference(ownerReference) && ownerReference.uid === job.metadata.uid;
}

function hasVolcanoJobOwnerReference(kubeObject: VolcanoMapKubeObject) {
  return (
    kubeObject.metadata.ownerReferences?.some(ownerReference =>
      isVolcanoJobOwnerReference(ownerReference)
    ) || false
  );
}

function makeVolcanoNode(
  kubeObject: VolcanoMapKubeObject,
  weight: number,
  subtitle: string,
  status: GraphNodeStatus | undefined,
  detailsComponent: ComponentType<GraphDetailsComponentProps>
) {
  return {
    id: kubeObject.metadata.uid,
    kubeObject,
    subtitle,
    status,
    weight,
    detailsComponent,
  };
}

function makeQueueNode(queue: VolcanoQueue) {
  return makeVolcanoNode(
    queue,
    5000,
    'Volcano Queue',
    getQueueStatusColor(queue.state),
    ({ node }: GraphDetailsComponentProps) => (
      <QueueDetail
        name={node.kubeObject.jsonData.metadata.name}
        cluster={node.kubeObject.cluster}
      />
    )
  );
}

function makeJobNode(job: VolcanoJob) {
  return makeVolcanoNode(
    job,
    4000,
    'Volcano Job',
    getJobStatusColor(job.phase),
    ({ node }: GraphDetailsComponentProps) => (
      <JobDetail
        namespace={node.kubeObject.jsonData.metadata.namespace}
        name={node.kubeObject.jsonData.metadata.name}
        cluster={node.kubeObject.cluster}
      />
    )
  );
}

function makePodGroupNode(podGroup: VolcanoPodGroup) {
  return makeVolcanoNode(
    podGroup,
    3000,
    'Volcano PodGroup',
    getPodGroupStatusColor(podGroup.phase),
    ({ node }: GraphDetailsComponentProps) => (
      <PodGroupDetail
        namespace={node.kubeObject.jsonData.metadata.namespace}
        name={node.kubeObject.jsonData.metadata.name}
        cluster={node.kubeObject.cluster}
      />
    )
  );
}

function makePodNode(pod: InstanceType<typeof PodResource>) {
  return {
    id: pod.metadata.uid,
    kubeObject: pod,
  };
}

function makeKubeToKubeEdge(from: VolcanoMapKubeObject, to: VolcanoMapKubeObject): GraphEdge {
  return {
    id: `${from.metadata.uid}-${to.metadata.uid}`,
    source: from.metadata.uid,
    target: to.metadata.uid,
  };
}

function makePodToJobEdge(pod: InstanceType<typeof PodResource>, job: VolcanoJob): GraphEdge {
  return {
    id: `${pod.metadata.uid}-${job.metadata.uid}`,
    source: pod.metadata.uid,
    target: job.metadata.uid,
  };
}

function getQueueHierarchyEdges(queues: VolcanoQueue[]) {
  const edges: GraphEdge[] = [];

  queues.forEach(queue => {
    const parentQueueName = queue.spec.parent;
    if (!parentQueueName) {
      return;
    }

    const parentQueue = queues.find(candidate => candidate.metadata.name === parentQueueName);
    if (parentQueue) {
      edges.push(makeKubeToKubeEdge(parentQueue, queue));
    }
  });

  return edges;
}

function getRelatedPodGroup(job: VolcanoJob, podGroups: VolcanoPodGroup[]) {
  const byOwnerReference = podGroups.find(podGroup =>
    podGroup.metadata.ownerReferences?.some(ownerReference =>
      referencesVolcanoJob(ownerReference, job)
    )
  );

  if (byOwnerReference) {
    return byOwnerReference;
  }

  // Owner refs are authoritative, name fallback keeps older objects connected when refs are absent.
  const canonicalName = `${job.metadata.name}-${job.metadata.uid}`;
  const byCanonicalName = podGroups.find(podGroup => podGroup.metadata.name === canonicalName);

  if (byCanonicalName) {
    return byCanonicalName;
  }

  return podGroups.find(podGroup => podGroup.metadata.name === job.metadata.name) || null;
}

function getJobToPodGroupEdges(jobs: VolcanoJob[], podGroups: VolcanoPodGroup[]) {
  const edges: GraphEdge[] = [];

  jobs.forEach(job => {
    const podGroup = getRelatedPodGroup(job, podGroups);
    if (podGroup) {
      edges.push(makeKubeToKubeEdge(job, podGroup));
    }
  });

  return edges;
}

function getVolcanoPods(pods: InstanceType<typeof PodResource>[]) {
  return pods.filter(pod => {
    const labels = pod.metadata.labels || {};
    const jobName = labels[volcanoJobNameLabel];
    const jobNamespace = labels[volcanoJobNamespaceLabel];
    const hasVolcanoJobLabels = Boolean(jobName && jobNamespace);

    return hasVolcanoJobOwnerReference(pod) || hasVolcanoJobLabels;
  });
}

function getPodJob(pod: InstanceType<typeof PodResource>, jobs: VolcanoJob[]) {
  const byOwnerReference = jobs.find(job =>
    pod.metadata.ownerReferences?.some(ownerReference => referencesVolcanoJob(ownerReference, job))
  );

  if (byOwnerReference) {
    return byOwnerReference;
  }

  const labels = pod.metadata.labels || {};
  const jobName = labels[volcanoJobNameLabel];
  const jobNamespace = labels[volcanoJobNamespaceLabel];

  if (!jobName || !jobNamespace) {
    return null;
  }

  return (
    jobs.find(
      candidate =>
        candidate.metadata.name === jobName && candidate.metadata.namespace === jobNamespace
    ) || null
  );
}

function getPodToJobEdges(jobs: VolcanoJob[], pods: InstanceType<typeof PodResource>[]) {
  const edges: GraphEdge[] = [];

  pods.forEach(pod => {
    const job = getPodJob(pod, jobs);
    if (job) {
      edges.push(makePodToJobEdge(pod, job));
    }
  });

  return edges;
}

const queueSource = {
  id: 'volcano-queues',
  label: 'queues',
  icon: volcanoMapIcon,
  useData() {
    const [queues] = VolcanoQueue.useList();

    return useMemo(() => {
      if (!queues) {
        return null;
      }

      return {
        nodes: queues.map(queue => makeQueueNode(queue)),
      };
    }, [queues]);
  },
};

const queueHierarchySource = {
  id: 'volcano-queue-hierarchy',
  label: 'queue hierarchy',
  icon: volcanoMapIcon,
  useData() {
    const [queues] = VolcanoQueue.useList();

    return useMemo(() => {
      if (!queues) {
        return null;
      }

      return {
        edges: getQueueHierarchyEdges(queues),
      };
    }, [queues]);
  },
};

const jobSource = {
  id: 'volcano-jobs',
  label: 'jobs',
  icon: volcanoMapIcon,
  useData() {
    const [jobs] = VolcanoJob.useList();

    return useMemo(() => {
      if (!jobs) {
        return null;
      }

      return {
        nodes: jobs.map(job => makeJobNode(job)),
      };
    }, [jobs]);
  },
};

const podGroupSource = {
  id: 'volcano-podgroups',
  label: 'podgroups',
  icon: volcanoMapIcon,
  useData() {
    const [podGroups] = VolcanoPodGroup.useList();
    const [jobs] = VolcanoJob.useList();

    return useMemo(() => {
      if (!podGroups || !jobs) {
        return null;
      }

      return {
        nodes: podGroups.map(podGroup => makePodGroupNode(podGroup)),
        edges: getJobToPodGroupEdges(jobs, podGroups),
      };
    }, [podGroups, jobs]);
  },
};

const podSource = {
  id: 'volcano-pods',
  label: 'pods',
  icon: volcanoMapIcon,
  useData() {
    const [pods] = PodResource.useList();
    const [jobs] = VolcanoJob.useList();

    return useMemo(() => {
      if (!pods || !jobs) {
        return null;
      }

      const volcanoPods = getVolcanoPods(pods).filter(pod => getPodJob(pod, jobs));

      return {
        nodes: volcanoPods.map(pod => makePodNode(pod)),
        edges: getPodToJobEdges(jobs, volcanoPods),
      };
    }, [pods, jobs]);
  },
};

export const volcanoSource = {
  id: 'volcano',
  label: 'Volcano',
  icon: volcanoMapIcon,
  sources: [queueSource, jobSource, podGroupSource, podSource, queueHierarchySource],
};
