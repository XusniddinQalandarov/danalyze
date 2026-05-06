import { worldToRadarPoint } from "@/lib/csdm/radarMath";

/**
 * CS2 map coordinate transforms.
 * Convert 3D world coordinates to 2D radar image pixel coordinates:
 *   x_pixel = ((world_x - posX) / scale) * (imageSize / radarSize)
 *   y_pixel = ((posY - world_y) / scale) * (imageSize / radarSize)
 * Values are aligned with cs-demo-manager map defaults (CS2).
 */
export interface MapConfig {
  name: string;
  displayName: string;
  posX: number;
  posY: number;
  scale: number;
  radarSize: number;
  imageSize: number;
  thresholdZ: number;
  flipX?: boolean;
  flipY?: boolean;
}

type BaseMapConfig = Omit<MapConfig, "thresholdZ">;

export const MAP_CONFIGS: Record<string, BaseMapConfig> = {
  cs_agency: {
    name: "cs_agency",
    displayName: "Agency",
    posX: -2597,
    posY: 2079,
    scale: 4.1817436,
    radarSize: 1024,
    imageSize: 1024,
  },
  cs_alpine: {
    name: "cs_alpine",
    displayName: "Alpine",
    posX: -2107,
    posY: 4687,
    scale: 6.5296063,
    radarSize: 1024,
    imageSize: 1024,
  },
  cs_assault: {
    name: "cs_assault",
    displayName: "Assault",
    posX: 4041,
    posY: 7838,
    scale: 4.6,
    radarSize: 1024,
    imageSize: 1024,
  },
  cs_italy: {
    name: "cs_italy",
    displayName: "Italy",
    posX: -2647,
    posY: 2592,
    scale: 4.6,
    radarSize: 1024,
    imageSize: 1024,
  },
  cs_militia: {
    name: "cs_militia",
    displayName: "Militia",
    posX: -1474,
    posY: 2296,
    scale: 4.5,
    radarSize: 1024,
    imageSize: 1024,
  },
  cs_office: {
    name: "cs_office",
    displayName: "Office",
    posX: -1838,
    posY: 1858,
    scale: 4.1,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_ancient: {
    name: "de_ancient",
    displayName: "Ancient",
    posX: -2953,
    posY: 2164,
    scale: 5.0,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_anubis: {
    name: "de_anubis",
    displayName: "Anubis",
    posX: -2796,
    posY: 3328,
    scale: 5.22,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_assembly: {
    name: "de_assembly",
    displayName: "Assembly",
    posX: 1628,
    posY: 4512,
    scale: 2.84,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_aztec: {
    name: "de_aztec",
    displayName: "Aztec",
    posX: -3200,
    posY: 2841,
    scale: 6.0,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_basalt: {
    name: "de_basalt",
    displayName: "Basalt",
    posX: -2345,
    posY: 2391,
    scale: 4.37,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_brewery: {
    name: "de_brewery",
    displayName: "Brewery",
    posX: -4122,
    posY: 4394,
    scale: 2.1820312,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_cache: {
    name: "de_cache",
    displayName: "Cache",
    posX: -2000,
    posY: 3250,
    scale: 5.5,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_canals: {
    name: "de_canals",
    displayName: "Canals",
    posX: -2496,
    posY: 1792,
    scale: 4.0,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_cbble: {
    name: "de_cbble",
    displayName: "Cbble",
    posX: -3840,
    posY: 3072,
    scale: 6.0,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_dogtown: {
    name: "de_dogtown",
    displayName: "Dogtown",
    posX: -1741,
    posY: 3295,
    scale: 2.0323243,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_dust: {
    name: "de_dust",
    displayName: "Dust",
    posX: -2850,
    posY: 4073,
    scale: 6.0,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_dust2: {
    name: "de_dust2",
    displayName: "Dust2",
    posX: -2476,
    posY: 3239,
    scale: 4.4,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_edin: {
    name: "de_edin",
    displayName: "Edin",
    posX: -383,
    posY: 4420,
    scale: 4.803717,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_golden: {
    name: "de_golden",
    displayName: "Golden",
    posX: -856,
    posY: 2399,
    scale: 4.506695,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_grail: {
    name: "de_grail",
    displayName: "Grail",
    posX: -4395,
    posY: 4203,
    scale: 2.1756864,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_inferno: {
    name: "de_inferno",
    displayName: "Inferno",
    posX: -2087,
    posY: 3870,
    scale: 4.9,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_jura: {
    name: "de_jura",
    displayName: "Jura",
    posX: -2126,
    posY: 2389,
    scale: 2.504188,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_memento: {
    name: "de_memento",
    displayName: "Memento",
    posX: -2111,
    posY: 2534,
    scale: 3.9720395,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_mills: {
    name: "de_mills",
    displayName: "Mills",
    posX: -4810,
    posY: -320,
    scale: 5.148437,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_mirage: {
    name: "de_mirage",
    displayName: "Mirage",
    posX: -3230,
    posY: 1713,
    scale: 5.0,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_nuke: {
    name: "de_nuke",
    displayName: "Nuke",
    posX: -3453,
    posY: 2887,
    scale: 7.0,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_overpass: {
    name: "de_overpass",
    displayName: "Overpass",
    posX: -4831,
    posY: 1781,
    scale: 5.2,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_palacio: {
    name: "de_palacio",
    displayName: "Palacio",
    posX: -2443,
    posY: 1896,
    scale: 3.8676212,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_palais: {
    name: "de_palais",
    displayName: "Palais",
    posX: -1353,
    posY: 2044,
    scale: 2.8003397,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_poseidon: {
    name: "de_poseidon",
    displayName: "Poseidon",
    posX: -1046,
    posY: 1166,
    scale: 3.0124886,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_rooftop: {
    name: "de_rooftop",
    displayName: "Rooftop",
    posX: -1847,
    posY: 2301,
    scale: 1.914732,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_sanctum: {
    name: "de_sanctum",
    displayName: "Sanctum",
    posX: -1846,
    posY: 674,
    scale: 3.658203,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_stronghold: {
    name: "de_stronghold",
    displayName: "Stronghold",
    posX: -2786,
    posY: 2598,
    scale: 2.9476247,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_thera: {
    name: "de_thera",
    displayName: "Thera",
    posX: -85,
    posY: 2261,
    scale: 4.846961,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_train: {
    name: "de_train",
    displayName: "Train",
    posX: -2308,
    posY: 2078,
    scale: 4.082077,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_vertigo: {
    name: "de_vertigo",
    displayName: "Vertigo",
    posX: -3168,
    posY: 1762,
    scale: 4.0,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_warden: {
    name: "de_warden",
    displayName: "Warden",
    posX: -3150,
    posY: 2681,
    scale: 5.642361,
    radarSize: 1024,
    imageSize: 1024,
  },
  de_whistle: {
    name: "de_whistle",
    displayName: "Whistle",
    posX: -1825,
    posY: 1104,
    scale: 2.8,
    radarSize: 1024,
    imageSize: 1024,
  },
};

export function worldToRadar(
  worldX: number,
  worldY: number,
  cfg: MapConfig
): { x: number; y: number } {
  const point = worldToRadarPoint(cfg, worldX, worldY);
  return {
    x: cfg.flipX ? cfg.imageSize - point.x : point.x,
    y: cfg.flipY ? cfg.imageSize - point.y : point.y,
  };
}

export function getMapConfig(mapName: string): MapConfig {
  const key = mapName.startsWith("de_") || mapName.startsWith("cs_") ? mapName : `de_${mapName}`;
  const map = MAP_CONFIGS[key] ?? MAP_CONFIGS["de_dust2"];
  return {
    ...map,
    thresholdZ: MAP_THRESHOLD_Z[map.name] ?? 0,
    flipY: MAP_FLIP_Y[map.name] ?? false,
  };
}

const MAP_THRESHOLD_Z: Record<string, number> = {
  cs_militia: 25,
  de_nuke: -495,
  de_palais: 103,
  de_thera: -4,
  de_vertigo: 11700,
};

const MAP_FLIP_Y: Record<string, boolean> = {};
