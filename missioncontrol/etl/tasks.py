import requests
from django.core.cache import cache

from missioncontrol.celery import celery
from missioncontrol.settings import FIREFOX_VERSION_URL


@celery.task
def fetch_versions():
    """
    Fetches a copy of version info for local serving / use
    """
    r = requests.get(FIREFOX_VERSION_URL)
    cache.set('FIREFOX_VERSIONS', r.json())
