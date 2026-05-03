from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import History
from django.utils import timezone
import json
from datetime import timedelta
from django.views.decorators.csrf import csrf_exempt

@require_http_methods(["GET"])
def get_history(request):
    try:
        
        n = int(request.GET.get('n', 10))  
        
        resource = request.GET.get('resource', None)          #optional filters 
        pid = request.GET.get('pid', None)  
        sort = request.GET.get('sort', 'latest')  # Sort order
        
        # Validate n
        if n < 1:
            return JsonResponse({'invalid n error'}, status=500)
            
        history_query = History.objects.all()
        
        if resource: # filters
            history_query = history_query.filter(resource=resource)
        
        
        if pid:
            try:
                pid = int(pid)
                history_query = history_query.filter(pid=pid)
            except ValueError:
                pass
        
        if sort == 'oldest':
            history_query = history_query.order_by('created_at')
        else: 
            history_query = history_query.order_by('-created_at')
        

        history_list = history_query[:n]         # Get N alerts
        
        history_data = []
        for history in history_list:
            history_data.append({
                'pid': history.pid,
                'process_name': history.process_name,
                'resource': history.resource,
                'created_at': history.created_at.isoformat(),
            })
        
        return JsonResponse({
            'success': True,
            'count': len(history_data),
            'history': history_data
        })
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["DELETE"]) #optional alert urana ho to 
def delete_history(request):
    try:
        history_id = request.GET.get('history_id')
        
        if not history_id:
            return JsonResponse({'error': 'id parameter required'}, status=400)
        
        history = History.objects.get(history_id=history_id)
        history.delete()
        
        return JsonResponse({
            'success': True,
            'message': 'history deleted'
        })
    
    except History.DoesNotExist:
        return JsonResponse({'error': 'History not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
