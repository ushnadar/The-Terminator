from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Q
from django.utils import timezone


class Settings(models.Model): #settings ka database to issi se ho jaye ga INCREDIBLE
    singleton_enforcer = models.BooleanField(default=True, unique=True)
    
    username = models.CharField(max_length=100, blank=True)
    # folder = models.CharField(max_length=255, blank=True)  # add later

    cpu_enabled = models.BooleanField(default=False)
    memory_enabled =models.BooleanField(default=False)
    disk_enabled =models.BooleanField(default=False)
    battery_enabled =models.BooleanField(default=False)
    network_enabled=models.BooleanField(default=False)

    cpu_threshold = models.IntegerField(null=True,blank=True,validators=[MinValueValidator(30), MaxValueValidator(100)],default=80)
    memory_threshold = models.IntegerField(null=True,blank=True,validators=[MinValueValidator(30), MaxValueValidator(100)],default=70)
    disk_threshold = models.IntegerField(null=True,blank=True,validators=[MinValueValidator(30), MaxValueValidator(100)],default=95)
    battery_threshold = models.IntegerField(null=True,blank=True,validators=[MinValueValidator(0), MaxValueValidator(100)],default=30)
    
    network_threshold = models.IntegerField(null=True,blank=True,validators=[MinValueValidator(30), MaxValueValidator(100)],default=90) # ye wala originally nahi tha included lekin add ker ke kya hi jaye ga

    class Meta: #checks ON the db directly
        constraints = [models.CheckConstraint(condition=Q(cpu_enabled=False) | Q(cpu_threshold__isnull=False),name="cpu_threshold_required_if_enabled"),
                models.CheckConstraint(condition=Q(memory_enabled=False) | Q(memory_threshold__isnull=False),name="memory_threshold_required_if_enabled"),
                models.CheckConstraint(condition=Q(disk_enabled=False) | Q(disk_threshold__isnull=False),name="disk_threshold_required_if_enabled"),
                models.CheckConstraint(condition=Q(battery_enabled=False) | Q(battery_threshold__isnull=False),name="battery_threshold_required_if_enabled"),
                models.CheckConstraint(condition=Q(network_enabled=False) | Q(network_threshold__isnull=False),name="network_threshold_required_if_enabled"),]
        

class Alerts(models.Model):
    alert_id = models.AutoField(primary_key=True)
    pid = models.IntegerField()  
    process_name = models.CharField(max_length=255, blank=True) 
    alert_level = models.CharField(max_length=50,default='warning')
    resource = models.CharField(max_length=50)
    
    alert_message = models.TextField(blank=True)  
    resource_value = models.FloatField(null=True, blank=True)  
    threshold = models.FloatField(null=True, blank=True)  
    
    created_at = models.DateTimeField(auto_now_add=True)  
    is_acknowledged = models.BooleanField(default=False)  # ye baad mei true ho jaye ga if the user handles this
    
    class Meta:
        ordering = ['-created_at']  # ordering
        indexes = [models.Index(fields=['-created_at']),models.Index(fields=['pid']),models.Index(fields=['resource']),]
    