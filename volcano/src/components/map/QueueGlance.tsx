import { Activity } from '@kinvolk/headlamp-plugin/lib';
import { StatusLabel } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import type { GraphNode } from '@kinvolk/headlamp-plugin/lib/components/resourceMap/graph/graphModel';
import MuiLink from '@mui/material/Link';
import { Box } from '@mui/system';
import type { MouseEvent } from 'react';
import { isVolcanoJobApiVersion, isVolcanoPodGroupApiVersion } from '../../utils/volcanoApi';
import QueueDetail from '../queues/Detail';

function getQueueName(node: GraphNode) {
  const apiVersion = node.kubeObject?.jsonData?.apiVersion;
  const kind = node.kubeObject?.jsonData?.kind;
  const queue = (node.kubeObject as any)?.queue;

  const isVolcanoJob = kind === 'Job' && isVolcanoJobApiVersion(apiVersion);
  const isVolcanoPodGroup = kind === 'PodGroup' && isVolcanoPodGroupApiVersion(apiVersion);

  if (!isVolcanoJob && !isVolcanoPodGroup) {
    return null;
  }

  return queue || null;
}

export function QueueGlance({ node }: { node: GraphNode }) {
  const queueName = getQueueName(node);

  if (!queueName) {
    return null;
  }

  const openQueueDetails = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    event.stopPropagation();

    Activity.launch({
      id: `volcano-queue-${node.kubeObject?.cluster || 'default'}-${queueName}`,
      location: 'split-right',
      temporary: true,
      cluster: node.kubeObject?.cluster,
      hideTitleInHeader: true,
      title: queueName,
      content: <QueueDetail name={queueName} cluster={node.kubeObject?.cluster} />,
    });
  };

  return (
    <Box
      display="flex"
      gap={1}
      alignItems="center"
      mt={2}
      flexWrap="wrap"
      onClick={event => event.stopPropagation()}
      onPointerDown={event => event.stopPropagation()}
    >
      <StatusLabel status="">
        Queue:{' '}
        <MuiLink href="#" onClick={openQueueDetails} title={queueName} underline="hover">
          {queueName}
        </MuiLink>
      </StatusLabel>
    </Box>
  );
}
