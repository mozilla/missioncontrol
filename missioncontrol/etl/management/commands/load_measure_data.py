from django.core.management.base import BaseCommand

from missioncontrol.etl.measure import update_measure


class Command(BaseCommand):
    """Management command to update data for a specific measure/platform/channel combination."""

    def add_arguments(self, parser):
        parser.add_argument('platform', metavar='platform', type=str,
                            help='platform to fetch data for')
        parser.add_argument('channel', metavar='channel', type=str,
                            help='channel to fetch data for')
        parser.add_argument('measure', metavar='measure', type=str,
                            help='measure to fetch data for')

    def handle(self, *args, **options):
        update_measure(options['platform'], options['channel'], options['measure'])
