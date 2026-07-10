import type { DataSet } from '../types';
import { bestScore, designerLeaderboard } from './stats';

export interface Badge {
  id: string;
  name: string;
  desc: string;
  icon: string;
  current: number;
  target: number;
  earned: boolean;
}

export function evaluateBadges(data: DataSet): Badge[] {
  const c = data.courses;
  const usStates = new Set(c.filter((x) => x.country === 'USA' && x.state).map((x) => x.state));
  const irish = c.filter((x) => x.country === 'Ireland').length;
  const top100played = c.filter((x) => x.gd100 || x.gm100).length;
  const hardCount = c.filter((x) => (x.slope ?? 0) >= 145).length;
  const rated = c.filter((x) => x.stars > 0).length;
  const scores = c.map(bestScore).filter((v): v is number => v != null);
  const broke90 = scores.some((s) => s < 90) ? 1 : 0;
  const broke80 = scores.some((s) => s < 80) ? 1 : 0;
  const replayCount = c.filter((x) => x.replay).length;
  const topDesigner = designerLeaderboard(c)[0]?.count ?? 0;
  const booked = data.mustplay.filter((m) => m.status === 'booked').length;
  const homeTurf = c.some((x) => /home course/i.test(x.notes)) ? 1 : 0;

  const def = (id: string, name: string, desc: string, icon: string, current: number, target: number): Badge => ({
    id, name, desc, icon, current: Math.min(current, target), target, earned: current >= target,
  });

  return [
    def('home-turf', 'Home Turf', 'Log your home course', '🏡', homeTurf, 1),
    def('road-tripper', 'Road Tripper', 'Play in 5 U.S. states', '🚗', usStates.size, 5),
    def('ten-state', 'Ten-State Tour', 'Play in 10 U.S. states', '🗺️', usStates.size, 10),
    def('links-pilgrim', 'Links Pilgrim', 'Play a round in Ireland', '☘️', irish >= 1 ? 1 : 0, 1),
    def('emerald-slam', 'Emerald Slam', 'Play 7 Irish courses', '🍀', irish, 7),
    def('t100-hunter', 'Top 100 Hunter', 'Play 1 Top-100 course', '🎯', top100played, 1),
    def('t100-collector', 'Top 100 Collector', 'Play 5 Top-100 courses', '🏆', top100played, 5),
    def('glutton', 'Glutton for Punishment', 'Play 5 courses with slope ≥145', '😤', hardCount, 5),
    def('critic', 'The Critic', 'Rate 10 courses', '⭐', rated, 10),
    def('broke-90', 'Broke 90', 'Post a round under 90', '💯', broke90, 1),
    def('broke-80', 'Broke 80', 'Post a round under 80', '🔥', broke80, 1),
    def('half-century', 'Half Century', 'Play 50 courses', '5️⃣0️⃣', c.length, 50),
    def('architecture-buff', 'Architecture Buff', 'Play 3 courses by one designer', '📐', topDesigner, 3),
    def('encore', 'Encore!', 'Flag 3 courses to replay', '🔁', replayCount, 3),
    def('committed', 'Committed', 'Book a tee time on your list', '📅', booked, 1),
  ];
}
