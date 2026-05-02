from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import Settings
import json

from django.views.decorators.csrf import csrf_exempt

def get_or_create_settings():
    settings, created = Settings.objects.get_or_create()
    return settings

@require_http_methods(["GET"])
def get_settings(request):
    try:
        settings = get_or_create_settings()  

        return JsonResponse({
            'username': settings.username,
            'cpu_enabled': settings.cpu_enabled,
            'cpu_threshold': settings.cpu_threshold,
            'memory_enabled': settings.memory_enabled,
            'memory_threshold': settings.memory_threshold,
            'disk_enabled':settings.disk_enabled,
            'disk_threshold':settings.disk_threshold,
            'battery_enabled':settings.battery_enabled,
            'battery_threshold':settings.battery_threshold,
            'network_enabled':settings.network_enabled,
            'network_threshold':settings.network_threshold,
            'folder-path':settings.folder,
            "allow_notifications":settings.allow_notifications

        })
    except Settings.DoesNotExist:
        return JsonResponse({'error': 'Settings not found'}, status=404)

@csrf_exempt
@require_http_methods(["POST"])
def update_settings(request):
    try:
        data = json.loads(request.body)
        settings = get_or_create_settings() 
        
        settings.username = data.get('username', settings.username)
        settings.cpu_enabled = data.get('cpu_enabled', settings.cpu_enabled)
        settings.cpu_threshold = data.get('cpu_threshold', settings.cpu_threshold)
        settings.memory_enabled = data.get('memory_enabled', settings.memory_enabled)
        settings.memory_threshold = data.get('memory_threshold', settings.memory_threshold)
        settings.disk_enabled = data.get('disk_enabled', settings.disk_enabled)
        settings.disk_threshold = data.get('disk_threshold', settings.disk_threshold)
        settings.battery_enabled = data.get('battery_enabled', settings.battery_enabled)
        settings.battery_threshold = data.get('battery_threshold', settings.battery_threshold)
        settings.network_enabled = data.get('network_enabled', settings.network_enabled)
        settings.network_threshold = data.get('network_threshold', settings.network_threshold)

        settings.folder= data.get('folder', settings.folder)

        settings.allow_notifications =data.get('allow_notifications',settings.allow_notifications)

        settings.full_clean()  #validation
        settings.save()
        
        return JsonResponse({'success': True, 'message': 'Settings updated'})
    except Settings.DoesNotExist:
        return JsonResponse({'error': 'Settings not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)