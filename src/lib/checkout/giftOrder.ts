export type GiftOrderState = {
  enabled: boolean;
  recipientName: string;
  recipientPhone: string;
  cardMessage: string;
};

export const DEFAULT_GIFT_ORDER_STATE: GiftOrderState = {
  enabled: false,
  recipientName: "",
  recipientPhone: "",
  cardMessage: "",
};
