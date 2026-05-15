import { Icon } from '@iconify/react';
import {
  registerKindIcon,
  registerKubeObjectGlance,
  registerMapSource,
} from '@kinvolk/headlamp-plugin/lib';
import { QueueGlance } from './components/map/QueueGlance';
import { volcanoSource } from './mapView';
import { volcanoJobApiGroup, volcanoSchedulingApiGroup } from './utils/volcanoApi';

const volcanoKindIcon = {
  icon: <Icon icon="custom:volcano" width="70%" height="70%" />,
  color: 'rgb(229, 39, 25)',
};

export function registerVolcanoMapExtensions() {
  registerMapSource(volcanoSource);
  registerKubeObjectGlance({ id: 'volcano-queue-glance', component: QueueGlance });

  registerKindIcon('Job', volcanoKindIcon, volcanoJobApiGroup);
  registerKindIcon('Queue', volcanoKindIcon, volcanoSchedulingApiGroup);
  registerKindIcon('PodGroup', volcanoKindIcon, volcanoSchedulingApiGroup);
}
