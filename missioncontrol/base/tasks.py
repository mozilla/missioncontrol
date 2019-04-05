import datetime

from missioncontrol.celery import celery
from missioncontrol.settings import DATA_EXPIRY_INTERVAL

from .models import Datum


@celery.task
def expire_old_data():
    max_age = datetime.datetime.now() - DATA_EXPIRY_INTERVAL
    Datum.objects.filter(timestamp__lt=max_age).delete()
