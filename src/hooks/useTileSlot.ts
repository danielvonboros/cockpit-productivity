import { createContext, useContext } from 'react';
import type { TileConfig } from '../types/models';

/** The grid slot a tile is rendered in, so the tile header can offer its size */
export const TileSlotContext = createContext<TileConfig | null>(null);

export function useTileSlot(): TileConfig | null {
  return useContext(TileSlotContext);
}
