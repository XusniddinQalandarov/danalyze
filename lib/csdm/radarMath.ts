export interface RadarTransformConfig {
  posX: number;
  posY: number;
  scale: number;
  radarSize: number;
  imageSize: number;
}

// Ported from cs-demo-manager map scaling helpers.
export function getScaledCoordinateX(cfg: RadarTransformConfig, worldX: number): number {
  const xForDefaultRadarWidth = (worldX - cfg.posX) / cfg.scale;
  return (xForDefaultRadarWidth * cfg.imageSize) / cfg.radarSize;
}

// Ported from cs-demo-manager map scaling helpers.
export function getScaledCoordinateY(cfg: RadarTransformConfig, worldY: number): number {
  const yForDefaultRadarHeight = (cfg.posY - worldY) / cfg.scale;
  return (yForDefaultRadarHeight * cfg.imageSize) / cfg.radarSize;
}

export function worldToRadarPoint(cfg: RadarTransformConfig, worldX: number, worldY: number) {
  return {
    x: getScaledCoordinateX(cfg, worldX),
    y: getScaledCoordinateY(cfg, worldY),
  };
}
