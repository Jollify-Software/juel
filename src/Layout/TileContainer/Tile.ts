export type TileSize = 'small' | 'medium' | 'wide' | 'large';

export interface TileItem {
    title: string;
    description?: string;
    backgroundColor?: string;
    imageUrl?: string;
    size: TileSize;
    draggable?: boolean;
  }