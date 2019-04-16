import logging
import requests

from missioncontrol.base.models import (Application,
                                        Channel,
                                        Experiment,
                                        Measure,
                                        Platform)
from missioncontrol.celery import celery
from missioncontrol.settings import (FIREFOX_EXPERIMENTS_URL,
                                     UPDATE_MEASURES_EXPIRY)
from missioncontrol.etl.measure import update_measures
from .builds import update_builds
from .experiment import update_experiment

logger = logging.getLogger(__name__)


@celery.task
def update_channel_measures():
    """
    Updates channel/platform data
    """
    logger.info('Scheduling data updates...')
    for channel in Channel.objects.all():
        for platform in Platform.objects.all():
            for application in Application.objects.all():
                if Measure.objects.filter(
                        channels=channel, platform=platform,
                        application=application).exists():
                    update_measures.apply_async(
                        args=[application.name, platform.name, channel.name],
                        expires=UPDATE_MEASURES_EXPIRY)


@celery.task
def update_experiment_data():
    """
    Updates the actual measures for all active experiments
    """
    active_experiments = Experiment.objects.filter(enabled=True).values_list(
        'name', flat=True)
    for active_experiment in active_experiments:
        update_experiment.apply_async(
            args=[active_experiment])


@celery.task
def update_build_data():
    """
    Updates the list of valid builds from buildhub
    """
    update_builds()


@celery.task
def update_experiment_list():
    """
    Updates the internal list of active experiments
    """
    logger.info('Updating active experiments...')
    r = requests.get(FIREFOX_EXPERIMENTS_URL)
    enabled_experiment_slugs = []
    for experiment in r.json():
        try:
            slug = experiment['recipe']['arguments']['slug']
        except KeyError:
            # not an experiment, continue
            continue
        Experiment.objects.update_or_create(
            name=slug, defaults={'enabled': True})
        enabled_experiment_slugs.append(slug)

    # any experiments not specified in that list should be considered inactive
    Experiment.objects.exclude(name__in=enabled_experiment_slugs).update(
        enabled=False)
