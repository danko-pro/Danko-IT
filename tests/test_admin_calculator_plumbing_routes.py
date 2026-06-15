from __future__ import annotations

import asyncio
import unittest
from dataclasses import replace
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from supply_bot.admin_api.app import create_admin_app
from supply_bot.admin_api.auth import SESSION_COOKIE_NAME, create_admin_session_token
from supply_bot.config import Settings, load_settings
from supply_bot.estimates.application.plumbing_snapshot import BuildPlumbingSnapshotUseCase
from supply_bot.storage_estimates.plumbing_repository import SqlAlchemyPlumbingRepository
from supply_bot.storage_estimates.tables import estimate_plumbing_catalog_items
from tests.admin_projects_routes_case import AdminProjectsRouteCase


async def _build_global_public_snapshot(db_path: Path) -> dict:
    """Собирает ПУБЛИЧНЫЙ снапшот из глобального (owner=None) репозитория поверх того же файла БД.

    Это эмулирует путь A7 (публичный снапшот на global): свежий движок читает только
    глобальные записи (owner_user_id IS NULL) — те же, что правит админка.
    """
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path.as_posix()}")
    try:
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        repository = SqlAlchemyPlumbingRepository(session_factory)  # owner=None по умолчанию
        return await BuildPlumbingSnapshotUseCase(repository, version="e2e-test").build_public()
    finally:
        await engine.dispose()


async def _global_catalog_stats(db_path: Path, *, source_code: str) -> dict:
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path.as_posix()}")
    try:
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        async with session_factory() as session:
            total = int(
                (
                    await session.execute(select(func.count()).select_from(estimate_plumbing_catalog_items))
                ).scalar_one()
            )
            matching = int(
                (
                    await session.execute(
                        select(func.count())
                        .select_from(estimate_plumbing_catalog_items)
                        .where(estimate_plumbing_catalog_items.c.source_code == source_code)
                    )
                ).scalar_one()
            )
            global_matching = int(
                (
                    await session.execute(
                        select(func.count())
                        .select_from(estimate_plumbing_catalog_items)
                        .where(
                            estimate_plumbing_catalog_items.c.source_code == source_code,
                            estimate_plumbing_catalog_items.c.owner_user_id.is_(None),
                        )
                    )
                ).scalar_one()
            )
        return {"total": total, "matching": matching, "global_matching": global_matching}
    finally:
        await engine.dispose()


class AdminCalculatorPlumbingRouteTests(AdminProjectsRouteCase):
    def _build_client(self) -> TestClient:
        suffix = uuid4().hex
        self._settings: Settings = replace(
            load_settings(self._create_settings_file(self._root)),
            admin_session_secret=f"plumbing-test-session-secret-{suffix}",
        )
        return TestClient(create_admin_app(self._settings))

    def _admin_cookie(self, *, subject: str = "admin@example.test") -> str:
        # Каталог сантехники — админский инструмент: подделываем валидную admin-сессию
        # (legacy password-login в тестах недоступен — ADMIN_PASSWORD_HASH = placeholder).
        token, _ = create_admin_session_token(
            self._settings.admin_session_secret or "",
            ttl_seconds=3600,
            subject=subject,
            role="admin",
        )
        return token

    def _login_admin(self, client: TestClient, *, subject: str = "admin@example.test") -> None:
        # Чистим jar перед сменой личности: иначе ранее выданная (напр. register) cookie
        # с domain/path может «перебить» plain cookies.set (известная особенность httpx).
        client.cookies.clear()
        client.cookies.set(SESSION_COOKIE_NAME, self._admin_cookie(subject=subject))

    def test_requires_session_without_cookie(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                # Без валидной сессии каждый mutating/read endpoint каталога — 401.
                self.assertEqual(client.get("/api/calculator/plumbing/catalog-items").status_code, 401)
                self.assertEqual(client.get("/api/calculator/plumbing/zones").status_code, 401)
                self.assertEqual(
                    client.post(
                        "/api/calculator/plumbing/catalog-items",
                        json={
                            "source_code": "work-water-point",
                            "public_title": "Точка ХВС/ГВС",
                            "category": "works",
                            "unit": "шт",
                        },
                    ).status_code,
                    401,
                )
                self.assertEqual(
                    client.get("/api/calculator/plumbing/snapshot/preview").status_code,
                    401,
                )
                self.assertEqual(
                    client.get("/api/calculator/plumbing/editor-snapshot").status_code,
                    401,
                )

    def test_non_admin_session_is_forbidden(self) -> None:
        # Каталог сантехники — глобальный прайс-лист под управлением только админ-роли (Вариант A).
        # Валидная НЕ-админская сессия (роль "user") должна получать 403 на любом /plumbing-роуте.
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                suffix = uuid4().hex
                register = client.post(
                    "/api/auth/register",
                    json={
                        "email": f"plumbing-user-{suffix}@example.test",
                        "password": "password-user",
                        "display_name": "Plumbing user",
                    },
                )
                self.assertEqual(register.status_code, 200)
                # Регистрация выдаёт роль "user" (не admin).
                self.assertEqual(register.json()["user"]["role"], "user")

                self.assertEqual(client.get("/api/calculator/plumbing/catalog-items").status_code, 403)
                self.assertEqual(client.get("/api/calculator/plumbing/zones").status_code, 403)
                self.assertEqual(client.get("/api/calculator/plumbing/snapshot/preview").status_code, 403)
                self.assertEqual(client.get("/api/calculator/plumbing/editor-snapshot").status_code, 403)
                self.assertEqual(
                    client.post(
                        "/api/calculator/plumbing/catalog-items",
                        json={
                            "source_code": f"user-atom-{suffix}",
                            "public_title": "Заблокировано для user",
                            "category": "works",
                            "unit": "шт",
                        },
                    ).status_code,
                    403,
                )
                self.assertEqual(
                    client.post(
                        "/api/calculator/plumbing/zones",
                        json={"zone_code": f"user-zone-{suffix}", "subgroup": "Кухня", "title": "Зона"},
                    ).status_code,
                    403,
                )
                self.assertEqual(
                    client.patch(
                        "/api/calculator/plumbing/catalog-items/1",
                        json={"public_title": "Заблокировано"},
                    ).status_code,
                    403,
                )
                self.assertEqual(
                    client.delete("/api/calculator/plumbing/zones/1").status_code,
                    403,
                )

    def test_invalid_payload_returns_422(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)

                # Отсутствуют обязательные поля (source_code/public_title/...) → Pydantic 422.
                missing_required = client.post(
                    "/api/calculator/plumbing/catalog-items",
                    json={"public_title": "Без кода"},
                )
                self.assertEqual(missing_required.status_code, 422)

                # Невалидный тип (число вместо строки/числа) → 422.
                bad_type = client.post(
                    "/api/calculator/plumbing/catalog-items",
                    json={
                        "source_code": "x",
                        "public_title": "x",
                        "category": "works",
                        "unit": "шт",
                        "work_price": "not-a-number",
                    },
                )
                self.assertEqual(bad_type.status_code, 422)

                # Состав зоны без обязательного atomic_source_code → 422.
                zone = client.post(
                    "/api/calculator/plumbing/zones",
                    json={"zone_code": f"z-{uuid4().hex}", "subgroup": "Кухня", "title": "Зона"},
                )
                self.assertEqual(zone.status_code, 200)
                zone_id = int(zone.json()["id"])
                bad_items = client.put(
                    f"/api/calculator/plumbing/zones/{zone_id}/items",
                    json={"items": [{"quantity": 1}]},
                )
                self.assertEqual(bad_items.status_code, 422)

    def test_crud_roundtrip_snapshot_and_global_shared_catalog(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                suffix = uuid4().hex
                # Админ A.
                self._login_admin(client, subject=f"admin-a-{suffix}")

                # source_code намеренно уникальные — глобальный seed (A5) уже занял канонические коды,
                # а на глобальные записи действует уникальный индекс по source_code.
                atom_code = f"test-water-point-{suffix}"
                faucet_code = f"test-kitchen-faucet-{suffix}"

                # CREATE атом
                create_item = client.post(
                    "/api/calculator/plumbing/catalog-items",
                    json={
                        "source_code": atom_code,
                        "public_title": "Монтаж точки ХВС/ГВС",
                        "technical_title": "Точка водоснабжения (internal)",
                        "category": "works",
                        "unit": "шт",
                        "work_price": 3500,
                        "note": "internal note",
                    },
                )
                self.assertEqual(create_item.status_code, 200)
                item = create_item.json()
                item_id = int(item["id"])
                self.assertEqual(item["source_code"], atom_code)
                self.assertNotIn("owner_user_id", item)

                # LIST атомов
                list_items = client.get("/api/calculator/plumbing/catalog-items")
                self.assertEqual(list_items.status_code, 200)
                self.assertIn(item_id, {int(row["id"]) for row in list_items.json()})

                # GET одного атома
                get_item = client.get(f"/api/calculator/plumbing/catalog-items/{item_id}")
                self.assertEqual(get_item.status_code, 200)
                self.assertEqual(get_item.json()["public_title"], "Монтаж точки ХВС/ГВС")

                # PATCH атома
                patch_item = client.patch(
                    f"/api/calculator/plumbing/catalog-items/{item_id}",
                    json={"public_title": "Монтаж точки водоснабжения", "work_price": 3700},
                )
                self.assertEqual(patch_item.status_code, 200)
                self.assertEqual(patch_item.json()["public_title"], "Монтаж точки водоснабжения")
                self.assertEqual(patch_item.json()["work_price"], 3700)

                faucet = client.post(
                    "/api/calculator/plumbing/catalog-items",
                    json={
                        "source_code": faucet_code,
                        "public_title": "Смеситель кухонный B",
                        "category": "equipment",
                        "unit": "шт",
                        "equipment_price": 12000,
                    },
                )
                self.assertEqual(faucet.status_code, 200)
                faucet_id = int(faucet.json()["id"])

                # CREATE зона (уникальный код, чтобы не пересекаться с seed-зонами).
                zone_code = f"zone-roundtrip-{suffix}"
                create_zone = client.post(
                    "/api/calculator/plumbing/zones",
                    json={
                        "zone_code": zone_code,
                        "subgroup": "Кухня",
                        "title": "Зона мойки",
                        "risk_percent": 6.4,
                        "active_package_code": "b",
                    },
                )
                self.assertEqual(create_zone.status_code, 200)
                zone = create_zone.json()
                zone_id = int(zone["id"])
                self.assertEqual(zone["base"], [])
                self.assertEqual(zone["packages"], [])

                # LIST зон
                list_zones = client.get("/api/calculator/plumbing/zones")
                self.assertEqual(list_zones.status_code, 200)
                self.assertIn(zone_id, {int(row["id"]) for row in list_zones.json()})

                # PATCH зоны
                patch_zone = client.patch(
                    f"/api/calculator/plumbing/zones/{zone_id}",
                    json={"title": "Зона мойки (изм.)", "risk_percent": 7.0},
                )
                self.assertEqual(patch_zone.status_code, 200)
                self.assertEqual(patch_zone.json()["title"], "Зона мойки (изм.)")

                # PUT состав зоны
                put_items = client.put(
                    f"/api/calculator/plumbing/zones/{zone_id}/items",
                    json={
                        "items": [
                            {
                                "atomic_item_id": item_id,
                                "atomic_source_code": atom_code,
                                "quantity": 1,
                                "coefficient": 1,
                            }
                        ]
                    },
                )
                self.assertEqual(put_items.status_code, 200)
                self.assertEqual(len(put_items.json()["base"]), 1)
                self.assertEqual(put_items.json()["base"][0]["atomic_source_code"], atom_code)
                # atomic_item_id резолвится против каталога сантехники (а не потолков, защита от MRO-коллизии).
                self.assertEqual(put_items.json()["base"][0]["atomic_item_id"], item_id)

                # PUT пакеты зоны
                put_packages = client.put(
                    f"/api/calculator/plumbing/zones/{zone_id}/packages",
                    json={
                        "packages": [
                            {
                                "package_code": "b",
                                "label": "Пакет B",
                                "items": [
                                    {
                                        "atomic_item_id": faucet_id,
                                        "atomic_source_code": faucet_code,
                                        "quantity": 1,
                                    }
                                ],
                            }
                        ]
                    },
                )
                self.assertEqual(put_packages.status_code, 200)
                packages = put_packages.json()["packages"]
                self.assertEqual([p["package_code"] for p in packages], ["b"])
                self.assertEqual(packages[0]["items"][0]["atomic_item_id"], faucet_id)

                # GET зоны (детально, с составом и пакетами)
                get_zone = client.get(f"/api/calculator/plumbing/zones/{zone_id}")
                self.assertEqual(get_zone.status_code, 200)
                self.assertEqual(len(get_zone.json()["base"]), 1)
                self.assertEqual(len(get_zone.json()["packages"]), 1)

                # Editor snapshot: items + zone details (base/packages) одним ответом.
                editor_snapshot = client.get("/api/calculator/plumbing/editor-snapshot")
                self.assertEqual(editor_snapshot.status_code, 200)
                snapshot_payload = editor_snapshot.json()
                self.assertIn("items", snapshot_payload)
                self.assertIn("zones", snapshot_payload)
                self.assertIn(item_id, {int(row["id"]) for row in snapshot_payload["items"]})
                snapshot_zone = next(row for row in snapshot_payload["zones"] if int(row["id"]) == zone_id)
                self.assertEqual(len(snapshot_zone["base"]), 1)
                self.assertEqual(len(snapshot_zone["packages"]), 1)
                self.assertEqual(snapshot_zone["base"][0]["atomic_source_code"], atom_code)
                self.assertEqual(snapshot_zone["packages"][0]["items"][0]["atomic_item_id"], faucet_id)

                # SNAPSHOT preview (internal payload: видны итоги + резерв)
                preview = client.get("/api/calculator/plumbing/snapshot/preview")
                self.assertEqual(preview.status_code, 200)
                preview_payload = preview.json()
                self.assertIn("version", preview_payload)
                self.assertIn("items", preview_payload)
                self.assertIn("zones", preview_payload)
                preview_zone = next(z for z in preview_payload["zones"] if z["code"] == zone_code)
                self.assertIn("riskPercent", preview_zone)
                self.assertEqual(preview_zone["riskPercent"], 7.0)
                preview_package = next(p for p in preview_zone["packages"] if p["code"] == "b")
                self.assertIn("subtotal", preview_package)
                self.assertIn("total", preview_package)

                # Глобальная модель (Вариант A): ВТОРОЙ админ видит и правит ТЕ ЖЕ глобальные записи.
                self._login_admin(client, subject=f"admin-b-{suffix}")
                shared_get = client.get(f"/api/calculator/plumbing/catalog-items/{item_id}")
                self.assertEqual(shared_get.status_code, 200)
                self.assertEqual(shared_get.json()["public_title"], "Монтаж точки водоснабжения")
                self.assertEqual(client.get(f"/api/calculator/plumbing/zones/{zone_id}").status_code, 200)
                shared_patch = client.patch(
                    f"/api/calculator/plumbing/catalog-items/{item_id}",
                    json={"public_title": "Изменено вторым админом"},
                )
                self.assertEqual(shared_patch.status_code, 200)
                self.assertEqual(shared_patch.json()["public_title"], "Изменено вторым админом")

                # Не-admin сессия не видит и не правит каталог (403), несмотря на общий глобальный прайс.
                client.cookies.clear()  # дальше действует только cookie, выданная register (роль "user")
                register_user = client.post(
                    "/api/auth/register",
                    json={
                        "email": f"plumbing-user-{suffix}@example.test",
                        "password": "password-user",
                        "display_name": "Plumbing user",
                    },
                )
                self.assertEqual(register_user.status_code, 200)
                self.assertEqual(
                    client.get(f"/api/calculator/plumbing/catalog-items/{item_id}").status_code,
                    403,
                )
                self.assertEqual(
                    client.patch(
                        f"/api/calculator/plumbing/catalog-items/{item_id}",
                        json={"public_title": "Blocked"},
                    ).status_code,
                    403,
                )
                self.assertEqual(
                    client.delete(f"/api/calculator/plumbing/zones/{zone_id}").status_code,
                    403,
                )

                # Возврат админу: DELETE (soft) атома и зоны.
                self._login_admin(client, subject=f"admin-a-{suffix}")
                delete_item = client.delete(f"/api/calculator/plumbing/catalog-items/{item_id}")
                self.assertEqual(delete_item.status_code, 200)
                self.assertEqual(delete_item.json()["deleted"], True)
                self.assertNotIn(
                    item_id,
                    {int(row["id"]) for row in client.get("/api/calculator/plumbing/catalog-items").json()},
                )

                delete_zone = client.delete(f"/api/calculator/plumbing/zones/{zone_id}")
                self.assertEqual(delete_zone.status_code, 200)
                self.assertEqual(delete_zone.json()["deleted"], True)

    def test_admin_edit_reaches_public_snapshot(self) -> None:
        # КЛЮЧЕВОЙ end-to-end: правка глобального атома через админ-API доходит до ПУБЛИЧНОГО снапшота.
        # Меняем «цену трубы» (pipe-ppr-d20, входит в базу зоны мойки) → итог зоны и unitPrice трубы меняются.
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                db_path = self._settings.database_path
                self._login_admin(client)

                # Снапшот ДО правки (на seed-данных, глобальный): парити «Зоны мойки».
                before = asyncio.run(_build_global_public_snapshot(db_path))
                sink_before = next(z for z in before["zones"] if z["code"] == "zone-kitchen-sink")
                pipe_before = next(i for i in before["items"] if i["code"] == "pipe-ppr-d20")
                self.assertEqual(pipe_before["unitPrice"], 115)
                self.assertEqual(sink_before["total"], 43530)  # активный пакет b, парити A3
                package_totals_before = {p["code"]: p["total"] for p in sink_before["packages"]}
                self.assertEqual(package_totals_before, {"c": 39487, "b": 43530, "a": 54915})

                stats_before = asyncio.run(_global_catalog_stats(db_path, source_code="pipe-ppr-d20"))
                self.assertEqual(stats_before["matching"], 1)
                self.assertEqual(stats_before["global_matching"], 1)

                # Находим глобальный атом трубы и правим его материал-цену через API (admin).
                items = client.get("/api/calculator/plumbing/catalog-items").json()
                pipe = next(row for row in items if row["source_code"] == "pipe-ppr-d20")
                pipe_id = int(pipe["id"])
                self.assertEqual(pipe["material_price"], 115)
                patch = client.patch(
                    f"/api/calculator/plumbing/catalog-items/{pipe_id}",
                    json={"material_price": 215},
                )
                self.assertEqual(patch.status_code, 200)
                self.assertEqual(patch.json()["material_price"], 215)

                # Снапшот ПОСЛЕ правки (тот же глобальный путь): изменения видны публично.
                after = asyncio.run(_build_global_public_snapshot(db_path))
                sink_after = next(z for z in after["zones"] if z["code"] == "zone-kitchen-sink")
                pipe_after = next(i for i in after["items"] if i["code"] == "pipe-ppr-d20")
                # unitPrice трубы = материал-цена (coefficient 1).
                self.assertEqual(pipe_after["unitPrice"], 215)
                # base_total вырос на (215-115)*20 = 2000; итог зоны (активный b) пересчитан с резервом.
                self.assertEqual(sink_after["total"], 45658)
                self.assertNotEqual(sink_after["total"], sink_before["total"])
                package_totals_after = {p["code"]: p["total"] for p in sink_after["packages"]}
                self.assertEqual(package_totals_after, {"c": 41615, "b": 45658, "a": 57043})

                # Правка применилась к ОДНОЙ глобальной записи (нет теневой копии, число строк не выросло).
                stats_after = asyncio.run(_global_catalog_stats(db_path, source_code="pipe-ppr-d20"))
                self.assertEqual(stats_after["total"], stats_before["total"])
                self.assertEqual(stats_after["matching"], 1)
                self.assertEqual(stats_after["global_matching"], 1)


if __name__ == "__main__":
    unittest.main()
