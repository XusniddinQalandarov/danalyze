export interface MatchListPlayerStatDTO {
  steamId: string;
  playerName: string;
  team: string;
  kills: number;
  deaths: number;
  assists: number;
  rating: number;
}

export interface MatchListItemDTO {
  id: string;
  mapName: string;
  scoreT: number;
  scoreCt: number;
  status: string;
  date: string;
  playerStats: MatchListPlayerStatDTO[];
}

export interface MatchViewerKillDTO {
  id: string;
  tick: number;
  attackerSteamId: string;
  victimSteamId: string;
  weapon: string;
  headshot: boolean;
  x: number;
  y: number;
  z: number;
}

export interface MatchViewerPlayerPositionDTO {
  id: string;
  tick: number;
  steamId: string;
  x: number;
  y: number;
  z?: number;
  yaw: number;
}

export interface MatchViewerGrenadeDTO {
  id: string;
  tick: number;
  type: string;
  steamId: string;
  trajectory: Array<{ x: number; y: number; z: number }>;
}

export interface MatchViewerRoundDTO {
  id: string;
  roundNum: number;
  winner: string;
  reason: string;
  tScore: number;
  ctScore: number;
}

export interface MatchViewerPlayerStatDTO {
  id: string;
  steamId: string;
  playerName: string;
  team: string;
  kills: number;
  deaths: number;
  assists: number;
  adr: number;
  hsPct: number;
  flashAssists: number;
  utilDamage: number;
  rating: number;
}

export interface MatchViewerDamageDTO {
  id: string;
  tick: number;
  attackerSteamId: string;
  victimSteamId: string;
  damage: number;
  hitgroup: string;
}

export interface MatchViewerDTO {
  id: string;
  mapName: string;
  scoreT: number;
  scoreCt: number;
  status: string;
  date: string;
  rounds: MatchViewerRoundDTO[];
  kills: MatchViewerKillDTO[];
  playerPositions: MatchViewerPlayerPositionDTO[];
  grenadeEvents: MatchViewerGrenadeDTO[];
  damages: MatchViewerDamageDTO[];
  playerStats: MatchViewerPlayerStatDTO[];
}
