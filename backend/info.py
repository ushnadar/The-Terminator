from abc import ABC,abstractmethod 

from rest_framework.decorators import APIView
from rest_framework.response import Response

import psutil
import time
import os

class global_info(ABC):
    @abstractmethod    
    def get_info(self): # will return the info as a dictionary 
        pass
    
    @abstractmethod    # will return the info as a response to the api call (ngl ts kinda fun) 
    def get(self): #this function NEEDS to be called get otherwise django throws a fit lmfao
        pass


class global_cpu_info(APIView,global_info):
    def get_info(self):
        cores=psutil.cpu_count(logical=False)
        threads=psutil.cpu_count(logical=True)
        usage=psutil.cpu_percent(interval=1)
        freq = psutil.cpu_freq()
        freq_min =freq.min
        freq_max= freq.max
        freq_current = freq.current
        
        return { #the fact this doesnt go to the next line annoys me 
        "cores":cores,
        'threads':threads,
        "usage":usage,
        "freq":freq_current,  #current frequency 
        "freq_max":freq_max,
        "freq_min":freq_min
        }
    
    def get(self,request):
        info= self.get_info()
        return Response(info)

class global_memory_info(APIView,global_info):
    def get_info(self):
        mem = psutil.virtual_memory()
        total= round(mem.total  /(1024**3),2) # to get in gigabytes
        available_mem= round(mem.available / (1024**3),2)
        used_mem= round(mem.used / (1024**3),2)
        used_percent= mem.percent 
        
        return { #the fact this doesnt go to the next line annoys me 
        "total": total,
        "used":used_mem,
        "available":available_mem,
        "used-perc":used_percent,
        }
    
    def get(self,request):
        info= self.get_info()
        return Response(info)


class global_storage_info(APIView,global_info):
    def get_info(self):
        REAL_FS = {'ext4', 'ext3', 'ext2', 'ntfs', 'fat32', 'exfat', 'apfs', 'xfs', 'btrfs', 'zfs', 'vfat', 'fuseblk'}  #ye filesystems OS ki apni hoti hain we dont wanna messa round with those
        
        partitions=psutil.disk_partitions()
        
        usage_list={} # dictionary better
        
        for parts in partitions:
            if parts.fstype not in REAL_FS:
                usage = psutil.disk_usage(parts.mountpoint)
                
                device_name=parts.device
                device_total=round(usage.total/(1024**3),2)
                device_used=round(usage.used/(1024**3),2)
                device_free=round(usage.free/(1024**3),2)
                device_perc= usage.percent
                
                current_tupple = { # haye Allah why
                # "name":device_name,
                "total":device_total,
                "used":device_used,
                "available":device_free, # ye FREE Q HAI IS KA NAAM STOOPID
                "used-perc":device_perc
                }

                usage_list[device_name] =current_tupple

        return { #the fact this doesnt go to the next line annoys me 
        "partitions":usage_list
        }
    
    def get(self,request):
        info= self.get_info()
        return Response(info)
    

class global_network_info(APIView,global_info):
    def get_info(self):
        
        connections=psutil.net_if_stats().items()

        speeds_list= {}

        for name, stats in connections:
            speeds_list[name]=stats.speed 

        return { #the fact this doesnt go to the next line annoys me 
        "connections": speeds_list
        }
    
    def get(self,request):
        info= self.get_info()
        return Response(info)
    

class global_battery_info(APIView,global_info):
    def get_info(self):
        b = psutil.sensors_battery()

        if(b is None): # lack of battery moment (me)
            return "no battery"
        
        percentage = b.percent
        charging=b.power_plugged
        time_left= round(b.secsleft / 3600,2) # in hours

        if(charging):

            return { #the fact this doesnt go to the next line annoys me 
            "perc":percentage,
            "charging":charging
            }
        
        else:
            return {  
            "perc":percentage,
            "charging":charging,
            "time":time_left          
        }


    
    def get(self,request):
        info= self.get_info()
        return Response(info)


        
