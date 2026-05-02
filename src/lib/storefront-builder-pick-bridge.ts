/** postMessage from storefront iframe → parent Visual builder */
export const STOREFRONT_BUILDER_PICK_MSG = "storefront_builder_pick" as const;

export type StorefrontBuilderPickMessage = {
  type: typeof STOREFRONT_BUILDER_PICK_MSG;
  pick: string;
};
