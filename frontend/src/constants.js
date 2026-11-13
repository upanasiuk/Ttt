export const STATUS_LABELS = {
  pending: "Ожидает отправки",
  in_transit: "В пути к CARGO",
  received_cargo: "Получен CARGO",
  issued: "Выдан",
};

export const UNITS_LIST = ["шт", "упак", "пар"];
export const STATUS_LIST = ["pending", "in_transit", "received_cargo", "issued"];

export const getStatusLabel = (val) => STATUS_LABELS[val] || val;

export const HISTORY_ACTION_LABELS = {
  created: "Создан",
  updated: "Изменён",
  issued: "Выдан",
  weighed: "Взвешен",
  deleted: "Удалён",
};

export const HISTORY_FIELD_LABELS = {
  barcode: "Трек-номер",
  parcel_id: "Партия",
  attachment: "Вложение",
  quantity: "Количество",
  unit: "Ед. изм.",
  price: "Стоимость",
  weight_g: "Вес",
  comment: "Комментарий",
  url: "Ссылка",
  status: "Статус",
  allocations: "Распределение",
};

export const getHistoryActionLabel = (val) => HISTORY_ACTION_LABELS[val] || val;
export const getHistoryFieldLabel = (val) => HISTORY_FIELD_LABELS[val] || val;