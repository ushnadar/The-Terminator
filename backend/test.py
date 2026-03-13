import psutil

def top_processes(n=5, sort_by='mem'):
    procs = []
    for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info']):
        io = p.io_counters()
        procs.append({
            # 'pid':   p.info['pid'],
            'name':  p.info['name'],
            'cpu':   p.info['cpu_percent'],
            'mem':   p.info['memory_info'].rss,
            # 'read':  io.read_bytes,
            # 'write': io.write_bytes,
            # 'conns': len(p.net_connections()),
        })

    print(sorted(procs, key=lambda x: x[sort_by], reverse=True)[:n])

top_processes(n=5, sort_by='cpu')   # top 5 by CPU
top_processes(n=10, sort_by='mem')  # top 10 by memory
# top_processes(n=3, sort_by='read')  # top 3 by disk reads