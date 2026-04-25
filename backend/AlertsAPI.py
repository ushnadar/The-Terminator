from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import Alerts
from django.utils import timezone
import json
from datetime import timedelta
from django.views.decorators.csrf import csrf_exempt

@require_http_methods(["GET"])
def get_alerts(request):
    try:
        
        n = int(request.GET.get('n', 10))  
        
        resource = request.GET.get('resource', None)          #optional filters 
        alert_level = request.GET.get('alert_level', None)  
        pid = request.GET.get('pid', None)  
        
        sort = request.GET.get('sort', 'latest')  # Sort order
        
        # Validate n
        if n < 1:
            return JsonResponse({'invalid n error'}, status=500)
            
        alerts_query = Alerts.objects.all()
        
        if resource: # filters
            alerts_query = alerts_query.filter(resource=resource)
        
        if alert_level:
            alerts_query = alerts_query.filter(alert_level=alert_level)
        
        if pid:
            try:
                pid = int(pid)
                alerts_query = alerts_query.filter(pid=pid)
            except ValueError:
                pass
        
        if sort == 'oldest':
            alerts_query = alerts_query.order_by('created_at')
        else: 
            alerts_query = alerts_query.order_by('-created_at')
        

        alerts_list = alerts_query[:n]         # Get N alerts
        
        alerts_data = []
        for alert in alerts_list:
            alerts_data.append({
                'alert_id': alert.alert_id,
                'pid': alert.pid,
                'process_name': alert.process_name,
                'alert_level': alert.alert_level,
                'resource': alert.resource,
                'alert_message': alert.alert_message,
                'resource_value': alert.resource_value,
                'threshold': alert.threshold,
                'created_at': alert.created_at.isoformat(),
                'is_acknowledged': alert.is_acknowledged,
            })
        
        return JsonResponse({
            'success': True,
            'count': len(alerts_data),
            'alerts': alerts_data
        })
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def acknowledge_alert(request): #this is the alert carry out kerna ho list mei sei (wese kya hi carry out ho ga agar time guzar jaye lol)
    try:
        alert_id = request.GET.get('alert_id')
        
        if not alert_id:
            return JsonResponse({'error': 'alert_id required'}, status=400)
        
        alert = Alerts.objects.get(alert_id=alert_id)
        alert.is_acknowledged = True
        alert.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Alert acknowledged'
        })
    
    except Alerts.DoesNotExist:
        return JsonResponse({'error': 'Alert not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["DELETE"]) #optional alert urana ho to 
def delete_alert(request):
    try:
        alert_id = request.GET.get('alert_id')
        
        if not alert_id:
            return JsonResponse({'error': 'id parameter required'}, status=400)
        
        alert = Alerts.objects.get(alert_id=alert_id)
        alert.delete()
        
        return JsonResponse({
            'success': True,
            'message': 'Alert deleted'
        })
    
    except Alerts.DoesNotExist:
        return JsonResponse({'error': 'Alert not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
