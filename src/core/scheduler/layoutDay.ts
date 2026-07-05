import { ScheduledBlock } from '../types';
import { toMinutes } from '../time';

export interface PositionedBlock {
  block: ScheduledBlock;
  top: number;
  height: number;
  lane: number;
  lanes: number;
}

export function layoutDay(
  blocks: ScheduledBlock[],
  dayStartMin: number,
  pxPerMin: number,
  minHeightPx: number,
): PositionedBlock[] {
  const positioned = blocks
    .map((block) => {
      const startPx = (toMinutes(block.start) - dayStartMin) * pxPerMin;
      const rawHeight = (toMinutes(block.end) - toMinutes(block.start)) * pxPerMin;
      return {
        block,
        top: Math.max(0, startPx),
        height: Math.max(rawHeight, minHeightPx),
        lane: 0,
        lanes: 1,
      };
    })
    .sort((a, b) => a.top - b.top);

  // Sweep top-down: a cluster is a run of blocks whose pixel intervals touch.
  // Within a cluster, greedily reuse the first free lane; all cluster members
  // share the same total lane count so widths line up visually.
  let clusterStart = 0;
  let clusterEnd = -Infinity;
  const laneEnds: number[] = [];

  const closeCluster = (endIdx: number) => {
    const lanes = Math.max(laneEnds.length, 1);
    for (let i = clusterStart; i < endIdx; i += 1) positioned[i].lanes = lanes;
  };

  positioned.forEach((p, i) => {
    if (p.top >= clusterEnd) {
      closeCluster(i);
      clusterStart = i;
      laneEnds.length = 0;
    }
    let lane = laneEnds.findIndex((end) => end <= p.top);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    p.lane = lane;
    laneEnds[lane] = p.top + p.height;
    clusterEnd = Math.max(clusterEnd, p.top + p.height);
  });
  closeCluster(positioned.length);

  return positioned;
}
