import os
import django
from winotify import Notification, audio
import threading
import time
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from backend.models import Settings, Alerts
from collections import defaultdict

NOTIFICATION_COOLDOWN = 30  # endless spam nahi chahiye bhai

class _CooldownTracker:
    """Singleton so state survives across multiple instantiations."""
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._last_notified = defaultdict(float)
        return cls._instance

    def should_fire(self, resource: str) -> bool:
        now = time.time()
        with self._lock:
            if now - self._last_notified[resource] < NOTIFICATION_COOLDOWN:
                return False
            self._last_notified[resource] = now
            return True


_cooldown_tracker = _CooldownTracker()


class show_alert_notification:
    def __init__(self, alert: Alerts):
        self.alert = alert

        # Check settings FIRST (cheap), then cooldown (modifies state)
        if not self._should_notify_for_resource(alert.resource):
            return

        # Cooldown check — only updates state if we're actually going to notify
        if not _cooldown_tracker.should_fire(alert.resource):
            return

        alert_config = {
            'critical': {
                'audio': audio.Mail,
                'title': '🚨 CRITICAL ALERT',
                'duration': 'long'
            },
            'threshold_exceeded': {
                'audio': audio.Mail,
                'title': '⚠️ THRESHOLD EXCEEDED',
                'duration': 'long'
            },
            'warning': {
                'audio': audio.Reminder,
                'title': '⚠️ WARNING',
                'duration': 'short'
            },
            'info': {
                'audio': audio.Default,
                'title': 'ℹ️ INFO',
                'duration': 'short'
            }
        }

        config = alert_config.get(alert.alert_level, alert_config['info'])

        toast = Notification(
            app_id="The Terminator",
            title=config['title'],
            msg=alert.alert_message,
            duration=config['duration']
        )

        toast.set_audio(config['audio'], loop=False)

        toast.add_actions(
            label="View All Alerts",
            launch="http://localhost:5173/alerts"
        )

        toast.show()

    def _get_settings(self):
        settings, _ = Settings.objects.get_or_create()
        return settings

    def _should_notify_for_resource(self, resource: str) -> bool:
        settings = self._get_settings()

        resource_enabled_map = {
            'cpu': settings.cpu_enabled,
            'memory': settings.memory_enabled,
            'disk': settings.disk_enabled,
            'battery': settings.battery_enabled,
            'network': settings.network_enabled,
            'filesystem': True,
        }

        return resource_enabled_map.get(resource, False) and settings.allow_notifications