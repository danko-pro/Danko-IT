// Базовые derived helpers для коллекций калькулятора.
// Эти функции не знают о конкретном stage и переиспользуются в нескольких контроллерах.

export function buildIdMap<T extends { id: number }>(items: T[] | null | undefined): Map<number, T> {
  return new Map((items ?? []).map((item) => [item.id, item]));
}

export function buildRoomStateById<T extends { room_id: number }>(rooms: T[]): Map<number, T> {
  return new Map(rooms.map((room) => [room.room_id, room]));
}
