"""
Публичный пакет persistence-слоя.
Снаружи проект по-прежнему импортирует `BotStorage` из `supply_bot.storage`,
а внутренняя реализация живёт в более явном `runtime`-модуле.
"""

from .runtime import BotStorage

__all__ = ["BotStorage"]
