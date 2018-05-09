import datetime

from django.core.management.base import (BaseCommand,
                                         CommandError)
from dateutil import parser

from missioncontrol.etl.measure import update_measure


class Command(BaseCommand):
    """Management command to update data for a specific measure/platform/channel combination."""

    def add_arguments(self, parser):
        parser.add_argument('application', metavar='application', type=str,
                            help='application to fetch data for')
        parser.add_argument('platform', metavar='platform', type=str,
                            help='platform to fetch data for')
        parser.add_argument('channel', metavar='channel', type=str,
                            help='channel to fetch data for')
        parser.add_argument('measure', metavar='measure', type=str,
                            help='measure to fetch data for')
        parser.add_argument('--start-date', dest='start_date')
        parser.add_argument('--end-date', dest='end_date')

    def handle(self, *args, **options):
        (start_date, end_date) = (options['start_date'], options['end_date'])
        if any((start_date, end_date)):
            if not all((start_date, end_date)):
                raise CommandError('Both --start-date and --end-date must be '
                                   'specified (or neither)')
            (start, end) = (parser.parse(start_date + ' -0000'),
                            parser.parse(end_date + ' -0000'))
            current = start
            while current <= end:
                update_measure(options['application'], options['platform'],
                               options['channel'], options['measure'],
                               submission_date=current, bulk_create=False)
                current += datetime.timedelta(days=1)
        else:
            update_measure(options['application'], options['platform'],
                           options['channel'], options['measure'])
