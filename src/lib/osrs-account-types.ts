/**
 * OSRS account type icons (Ironman, UIM, HCIM, UHCIM)
 */

const WIKI = "https://oldschool.runescape.wiki/images";

export type AccountType =
  | "normal"
  | "ironman"
  | "ultimate_ironman"
  | "hardcore_ironman"
  | "ultimate_hardcore_ironman";

export const ACCOUNT_TYPES: { id: AccountType; label: string; icon: string }[] = [
  { id: "normal", label: "Normal", icon: "" },
  { id: "ironman", label: "Ironman", icon: `${WIKI}/Ironman_helm.png` },
  { id: "ultimate_ironman", label: "Ultimate Ironman", icon: `${WIKI}/Ultimate_ironman_helm.png` },
  { id: "hardcore_ironman", label: "Hardcore Ironman", icon: `${WIKI}/Hardcore_ironman_helm.png` },
  { id: "ultimate_hardcore_ironman", label: "Ultimate Hardcore Ironman", icon: `${WIKI}/Ultimate_hardcore_ironman_helm.png` },
];
