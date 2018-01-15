from django.core.management.base import (BaseCommand,
                                         CommandError)

from missioncontrol.base.models import Experiment
from missioncontrol.etl.experiment import update_experiment


class Command(BaseCommand):
    """Management command to update data for a specific experiment"""

    def add_arguments(self, parser):
        parser.add_argument('experiment', metavar='experiment', type=str,
                            help='experiment to update')

    def handle(self, *args, **options):
        # make sure experiment exists before trying to get (more) data
        # for it
        experiment = Experiment.objects.get(name=options['experiment'])

        if not experiment.enabled:
            raise CommandError("Tried to load data for non-enabled "
                               "experiment")

        update_experiment(options['experiment'])
