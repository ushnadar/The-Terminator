from django.urls import path
from .info import global_cpu_info #cpu info ki class 
from .info import global_memory_info #
from .info import global_storage_info 
from .info import global_network_info 
from .info import global_battery_info # ts be so redundant lmfao 
# currently the ones above ONLY handle global stuff no per process yet 
from .info import processes_info

from . import SettingsAPI #settings wala api (totally separate)
from . import AlertsAPI 
from . import HistoryAPI

from .TerminatorAI import TerminatorAnalysisView, TerminatorExecuteView


urlpatterns = [
    path('api/cpu-info/', global_cpu_info.as_view()),
    path('api/memory-info/', global_memory_info.as_view()),
    path('api/storage-info/', global_storage_info.as_view()),   
    path('api/network-info/', global_network_info.as_view()),   
    path('api/battery-info/', global_battery_info.as_view()), 
    path('api/process-info/', processes_info.as_view()),
    
    path('api/settings/', SettingsAPI.get_settings),
    path('api/settings/update/', SettingsAPI.update_settings),
    
    path('api/alerts/', AlertsAPI.get_alerts),
    path('api/alerts/acknowledge/', AlertsAPI.acknowledge_alert),
    path('api/alerts/delete/', AlertsAPI.delete_alert),

    path('api/history/', HistoryAPI.get_history),
    path('api/history/delete/', HistoryAPI.delete_history),

    path('api/terminator/analyze/', TerminatorAnalysisView.as_view()),
    path('api/terminator/execute/', TerminatorExecuteView.as_view()),

]