import os
import django
from winotify import Notification, audio
import threading
import time
import sys

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from backend.models import Settings, Alerts

from collections import defaultdict

_last_notified: dict[str, float] = defaultdict(float)
NOTIFICATION_COOLDOWN = 10  #endless spam nahi chahiye bhai 

class show_alert_notification:
    def __init__(self,alert:Alerts):
        self.alert=alert

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
        
        if(self.should_notify_for_resource(alert.resource)):

            now = time.time()
            last = _last_notified[alert.resource]
            if now - last < NOTIFICATION_COOLDOWN:
                return  # too soon, skip
            _last_notified[alert.resource] = now

            toast = Notification(
                app_id="The Terminator",
                title=config['title'],
                msg=alert.alert_message,
                duration=config['duration']
            )
            
            # Set audio
            toast.set_audio(config['audio'], loop=False)
            
            
            # toast.add_actions(
            #     label="Acknowledge Alert",
            #     launch=f"http://127.0.0.1:8000/api/alerts/acknowledge?alert_id={alert.alert_id}"  #idher actually frontend ka anna hai lekin abhi ke liye backend ka url daal diya hai cause why not
            # )
            
            toast.add_actions(
                label="View All Alerts",
                launch=f"http://localhost:5173/alerts"
            )

            toast.show()
    
    def get_settings(self):
        settings, _ = Settings.objects.get_or_create()
        return settings
    
    def should_notify_for_resource(self, resource):
        settings = self.get_settings()
        
        resource_enabled_map = {
            'cpu': settings.cpu_enabled,
            'memory': settings.memory_enabled,
            'disk': settings.disk_enabled,
            'battery': settings.battery_enabled,
            'network': settings.network_enabled,
            'filesystem': True,
        }
        
        return resource_enabled_map.get(resource, False) and settings.allow_notifications 
  