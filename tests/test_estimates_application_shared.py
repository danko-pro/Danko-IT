from __future__ import annotations

import unittest

from supply_bot.estimates.application.shared import (
    clamp_minimum,
    clamp_non_negative,
    clamp_optional_non_negative,
    normalize_optional_text,
    normalize_required_text,
    normalize_room_name_or_fallback,
    require_positive_number,
)


class EstimatesApplicationSharedTests(unittest.TestCase):
    def test_normalize_required_text_returns_trimmed_value(self) -> None:
        self.assertEqual(normalize_required_text("  Test  ", error_message="Required"), "Test")

    def test_normalize_required_text_rejects_empty_values(self) -> None:
        with self.assertRaisesRegex(ValueError, "Required"):
            normalize_required_text("   ", error_message="Required")

        with self.assertRaisesRegex(ValueError, "Required"):
            normalize_required_text(None, error_message="Required")

    def test_normalize_optional_text_returns_trimmed_value_or_none(self) -> None:
        self.assertEqual(normalize_optional_text("  Note  "), "Note")
        self.assertIsNone(normalize_optional_text("   "))
        self.assertIsNone(normalize_optional_text(None))

    def test_clamp_minimum(self) -> None:
        self.assertEqual(clamp_minimum(0, 0.1), 0.1)
        self.assertEqual(clamp_minimum(2.7, 0.1), 2.7)

    def test_clamp_non_negative(self) -> None:
        self.assertEqual(clamp_non_negative(-5), 0.0)
        self.assertEqual(clamp_non_negative(3), 3.0)

    def test_clamp_optional_non_negative(self) -> None:
        self.assertIsNone(clamp_optional_non_negative(None))
        self.assertEqual(clamp_optional_non_negative(-5), 0.0)
        self.assertEqual(clamp_optional_non_negative(3), 3.0)

    def test_require_positive_number(self) -> None:
        self.assertEqual(require_positive_number(3, error_message="Positive required"), 3.0)

        with self.assertRaisesRegex(ValueError, "Positive required"):
            require_positive_number(None, error_message="Positive required")

        with self.assertRaisesRegex(ValueError, "Positive required"):
            require_positive_number(0, error_message="Positive required")

        with self.assertRaisesRegex(ValueError, "Positive required"):
            require_positive_number(-1, error_message="Positive required")

    def test_normalize_room_name_or_fallback(self) -> None:
        self.assertEqual(normalize_room_name_or_fallback("  Kitchen  ", fallback_index=3), "Kitchen")
        self.assertEqual(normalize_room_name_or_fallback("   ", fallback_index=3), "Помещение 3")
        self.assertEqual(normalize_room_name_or_fallback(None, fallback_index=1), "Помещение 1")
