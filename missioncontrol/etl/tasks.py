import logging

from missioncontrol.celery import celery
from .measure import update_measure
from .schema import (CHANNELS, PLATFORMS)

logger = logging.getLogger(__name__)


@celery.task
def update_measures():
    """
    Updates channel/platform data
    """
    logger.info('Scheduling data updates...')
    for channel_name in CHANNELS.keys():
        for (platform_name, platform) in PLATFORMS.items():
            for measure_name in platform['measures']:
                update_measure.apply_async(
                    args=[platform_name, channel_name, measure_name])
