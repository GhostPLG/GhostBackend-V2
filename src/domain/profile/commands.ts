// src/domain/profile/commands.ts
import { Profile } from "./Profile";

export interface McpCommandResult {
  changedItemId: string | null;
  changedProfile: Profile;
}

const LOCKER_TEMPLATE = "CosmeticLocker:cosmeticlocker_athena";

/** Nome do slot que o cliente envia → chave real em locker_slots_data.slots */
const SLOT_MAP: Record<string, string> = {
  Character: "Character",
  Backpack: "Backpack",
  Pickaxe: "Pickaxe",
  Glider: "Glider",
  Dance: "Dance",
  Emote: "Dance",
  ItemWrap: "ItemWrap",
  LoadingScreen: "LoadingScreen",
  Contrail: "SkyDiveContrail",
  SkyDiveContrail: "SkyDiveContrail",
  MusicPack: "MusicPack",
};

export const equipBattleRoyaleCustomization = (
  profile: Profile,
  body: any
): McpCommandResult => {
  const slotName = String(body?.slotName ?? "");
  const itemToSlot = String(body?.itemToSlot ?? "");
  const indexWithinSlot = Number(body?.indexWithinSlot ?? 0);

  const targetSlot = SLOT_MAP[slotName];
  if (!targetSlot) {
    return { changedItemId: null, changedProfile: profile };
  }

  const items = { ...(profile.items ?? {}) } as Record<string, any>;

  // Encontra o item de locker (CosmeticLocker) do perfil
  const lockerId = Object.keys(items).find(
    (id) => items[id]?.templateId === LOCKER_TEMPLATE
  );
  if (!lockerId) {
    return { changedItemId: null, changedProfile: profile };
  }

  const locker = structuredClone(items[lockerId]);
  const slots = locker?.attributes?.locker_slots_data?.slots ?? {};
  const slot = slots[targetSlot] ?? { items: [""] };

  const slotItems: string[] = Array.isArray(slot.items)
    ? [...slot.items]
    : [""];
  while (slotItems.length <= indexWithinSlot) slotItems.push("");

  slotItems[indexWithinSlot] = itemToSlot;

  slots[targetSlot] = {
    ...slot,
    items: slotItems,
    activeVariants: Array.isArray(body?.variantUpdates)
      ? body.variantUpdates
      : slot.activeVariants ?? [null],
  };

  locker.attributes.locker_slots_data.slots = slots;

  // Espelha nos stats para o cliente ler o equipado atual
  const stats = { ...(profile.stats ?? {}) } as any;
  const attributes = { ...(stats.attributes ?? {}) };
  attributes.last_applied_loadout = lockerId;

  switch (targetSlot) {
    case "Character":
      attributes.favorite_character = itemToSlot;
      break;
    case "Pickaxe":
      attributes.favorite_pickaxe = itemToSlot;
      break;
    case "Glider":
      attributes.favorite_glider = itemToSlot;
      break;
    case "SkyDiveContrail":
      attributes.favorite_skydivecontrail = itemToSlot;
      break;
    case "Backpack":
      attributes.favorite_backpack = itemToSlot;
      break;
  }

  stats.attributes = attributes;

  items[lockerId] = locker;

  const updated: Profile = {
    ...profile,
    items,
    stats,
    rvn: profile.rvn + 1,
    commandRevision: profile.commandRevision + 1,
    updatedAt: new Date().toISOString(),
  };

  return { changedItemId: lockerId, changedProfile: updated };
};