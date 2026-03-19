from abc import ABC,abstractmethod 

from rest_framework.decorators import APIView
from rest_framework.response import Response

import psutil
import time
import os


processes_to_ignore=set()  #names of processes to ignore (built in for now baad mei ig user selected bhi add kerein gei)
processes_to_ignore.add('System Idle Process')
processes_to_ignore.add('MemCompression')
processes_to_ignore.add('MsMpEng.exe')


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
        usage_per_core=psutil.cpu_percent(interval=1,percpu=True)
        freq = psutil.cpu_freq() 
        
        # freq_per_core= psutil.cpu_freq(percpu=True)
        # cores_freq_list=[]
        # for i in freq_per_core:
        #     cores_freq_list.append(round(i.current/1000,2))
       
        freq_current = round(freq.current/1000,2)
        
        return { #the fact this doesnt go to the next line annoys me 
        "cores":cores,
        'threads':threads,
        "total usage":usage, #total 
        "per thread usage": usage_per_core,
        "total freq":freq_current,  #current frequency 
        
        # "per thread freq":cores_freq_list,
        # "ATTENTION": "ye per thread freq is broken so ig we wont be using it"
        # "freq_max":freq_max, in ki zaroroat nahi hai frfrfrfr
        # "freq_min":freq_min
        
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

        # Interface link speeds
        speeds_list = {
            name: stats.speed
            for name, stats in psutil.net_if_stats().items()
        }

        # Measure real-time bandwidth
        old = psutil.net_io_counters()
        time.sleep(1)
        new = psutil.net_io_counters()

        download_speed = (new.bytes_recv - old.bytes_recv) / (1024**2)
        upload_speed = (new.bytes_sent - old.bytes_sent) / (1024**2)

        return {
            # "connections": speeds_list,
            "download_MBps": round(download_speed, 2),
            "upload_MBps": round(upload_speed, 2)
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
        
        if b.secsleft == psutil.POWER_TIME_UNKNOWN: #garbage value de rha tha koi idk, -1 wow idk man i aint even have a battery to test this 
            time_left = "unknown"
        elif b.secsleft == psutil.POWER_TIME_UNLIMITED: # returns -2 which gets jumbled
            time_left = "plugged in" 
        else:
            time_left= round(b.secsleft / (3600),2) # in hours

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
    


class processes_info(APIView,global_info):
    def get_info(self, n=5, sort_by='cpu'):
        
        if (sort_by == 'network'):
            procs = []
            pid_io_before = {}
            for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info']):
                
                if p.info['name'] in processes_to_ignore:
                        continue
                if p.info['pid'] == os.getpid():
                        continue
                pid_io_before[p.pid] = {
                        'proc': p,
                        'io':   p.io_counters()
                    }
               

            time.sleep(1)  # need 2 points to measure the speed

            for pid, data in pid_io_before.items():
                
                p   = data['proc']
                io_after  = p.io_counters()
                io_before = data['io']

                upload_MBps   = round((io_after.write_bytes - io_before.write_bytes) /(1024**2), 2)
                download_MBps = round((io_after.read_bytes  - io_before.read_bytes)  /(1024**2), 2)

                procs.append({
                    'pid':          p.info['pid'],
                    'name':         p.info['name'],
                    'upload_MBps':   upload_MBps,
                    'download_MBps': download_MBps,
                })
                
            procs = sorted(procs, key=lambda x: x['upload_MBps'] + x['download_MBps'], reverse=True)

            return procs[:n]
        else: 
            procs = []

            # First call to initialize
            for p in psutil.process_iter(['pid', 'name', 'memory_info']): #this stupid library requires 2 calls to get the actual cpu usage (insane)
                p.cpu_percent() 

            time.sleep(0.5) # 2 calls woh bhi separated DA HELL

            cpu_count = psutil.cpu_count()

            for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info']):
            
                # if p.info['name'] == 'System Idle Process': #fake process that shows unused cpu usage for some messed up reason 
                #     continue
                
                # if p.info['name'] == 'MsMpEng.exe': #windows anti malware executable (built in anti virus ab is se to pangay nahi le sakte lol)
                #     continue

                # if p.info['name'] == 'MemCompression': #memory compression ka program dat cant be killed
                #     continue
                
                if p.info['name'] in processes_to_ignore:
                    continue

                if p.info['pid'] == os.getpid(): #khud ko toh list mei nahi dalna na lol dont wanna flag ourselves as the resource hog we are lol RIGHT?
                    continue
                    
                process_name=p.info['name']
                process_cpu_usage=round(p.info['cpu_percent']/ cpu_count ,2) # lil bro returns by adding ALL THREAD's percentage so need to divide it by the count of threads
                process_memory_usage= round(p.info['memory_info'].rss/(1024**2),2) #need mbs

                procs.append({
                    'pid':   p.info['pid'], #is ke beghair browsers ke tabs mei confusion ho jana
                    'name':process_name,
                    'cpu':process_cpu_usage,
                    'mem': process_memory_usage,
                    # 'read':  read,
                    # 'write': write,
                }
                )

            procs = sorted(procs, key=lambda x: x[sort_by], reverse=True)

            return procs[:n]
    
    def get(self,request):
        n= int(request.query_params.get('n',5)) #size of kitne programs chahiyen list mei
        sort_by = request.query_params.get('sort_by','cpu') #key for sorting
        info=self.get_info(n, sort_by)
        return Response(info)


