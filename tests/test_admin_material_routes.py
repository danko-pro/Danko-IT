from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.config import load_settings


def _create_settings_file(root: Path) -> Path:
    config_path = root / ".env.test"
    config_path.write_text(
        "\n".join(
            [
                "BOT_TOKEN=test-token",
                "DEBUG=1",
                "DATABASE_PATH=./test.sqlite3",
                "ADMIN_PASSWORD_HASH=your_admin_password_hash_here",
                "ADMIN_SESSION_SECRET=your_admin_session_secret_here",
                "PROJECT_DOCUMENTS_DIR=./project-documents",
            ]
        ),
        encoding="utf-8",
    )
    return config_path


def _create_family(client: TestClient, name: str) -> int:
    response = client.post(
        "/api/materials/families",
        json={
            "canonical_name": name,
            "default_unit": "pcs",
            "dialog_fields": ["brand"],
            "category": "test",
        },
    )
    assert response.status_code == 200
    return int(response.json()["id"])


def _create_variant(client: TestClient, family_id: int, name: str) -> int:
    response = client.post(
        "/api/materials/variants",
        json={
            "family_id": family_id,
            "display_name": name,
        },
    )
    assert response.status_code == 200
    return int(response.json()["id"])


def _create_sku(client: TestClient, family_id: int, variant_id: int, title: str) -> int:
    response = client.post(
        "/api/materials/skus",
        json={
            "family_id": family_id,
            "variant_id": variant_id,
            "title": title,
            "unit": "pcs",
        },
    )
    assert response.status_code == 200
    return int(response.json()["id"])


def test_material_alias_counts_newline_separated_values() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_settings_file(root))

        with TestClient(create_admin_app(settings)) as client:
            family_id = _create_family(client, "Alias target")

            response = client.post(
                "/api/materials/aliases",
                json={
                    "alias": "alpha\nbeta; gamma, delta",
                    "family_id": family_id,
                },
            )

            assert response.status_code == 200
            assert response.json()["created_count"] == 4


def test_material_alias_rejects_variant_from_other_family() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_settings_file(root))

        with TestClient(create_admin_app(settings)) as client:
            family_a_id = _create_family(client, "Family A")
            family_b_id = _create_family(client, "Family B")
            variant_b_id = _create_variant(client, family_b_id, "Variant B")

            response = client.post(
                "/api/materials/aliases",
                json={
                    "alias": "cross-family variant",
                    "family_id": family_a_id,
                    "variant_id": variant_b_id,
                },
            )

            assert response.status_code == 400
            assert response.json()["detail"] == "Variant does not belong to family"


def test_material_alias_rejects_sku_from_other_family_or_variant() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_settings_file(root))

        with TestClient(create_admin_app(settings)) as client:
            family_a_id = _create_family(client, "SKU Family A")
            family_b_id = _create_family(client, "SKU Family B")
            variant_a_id = _create_variant(client, family_a_id, "Variant A")
            variant_b_id = _create_variant(client, family_b_id, "Variant B")
            sku_b_id = _create_sku(client, family_b_id, variant_b_id, "SKU B")

            family_response = client.post(
                "/api/materials/aliases",
                json={
                    "alias": "cross-family sku",
                    "family_id": family_a_id,
                    "sku_id": sku_b_id,
                },
            )
            variant_response = client.post(
                "/api/materials/aliases",
                json={
                    "alias": "cross-variant sku",
                    "variant_id": variant_a_id,
                    "sku_id": sku_b_id,
                },
            )

            assert family_response.status_code == 400
            assert family_response.json()["detail"] == "SKU does not belong to family"
            assert variant_response.status_code == 400
            assert variant_response.json()["detail"] == "SKU does not belong to variant"


def test_material_sku_rejects_negative_or_zero_dimensions() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_settings_file(root))

        with TestClient(create_admin_app(settings)) as client:
            family_id = _create_family(client, "Dimension family")

            response = client.post(
                "/api/materials/skus",
                json={
                    "family_id": family_id,
                    "title": "Broken dimensions",
                    "unit": "pcs",
                    "thickness_mm": -1,
                    "length_mm": 0,
                    "width_mm": 100,
                },
            )

            assert response.status_code == 400
            assert response.json()["detail"] == "thickness_mm must be positive"
