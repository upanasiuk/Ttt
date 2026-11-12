export const STATUS_LABELS = {
  pending: "Ожидает отправки",
  in_transit: "В пути к CARGO",
  received_cargo: "Получен CARGO",
  issued: "Выдан",
};

export const UNITS_LIST = ["шт", "упак", "пар"];
export const STATUS_LIST = ["pending", "in_transit", "received_cargo", "issued"];

export const getStatusLabel = (val) => STATUS_LABELS[val] || val;