import datetime

from django.core.management.base import (BaseCommand,
                                         CommandError)
from dateutil import parser

from missioncontrol.base.models import (Application,
                                        Channel,
                                        Measure,
                                        Platform)
from missioncontrol.etl.measure import update_measures


class Command(BaseCommand):
    """Management command to update data for a specific platform/channel combination."""

    def add_arguments(self, parser):
        parser.add_argument('--application', dest='application', type=str,
                            help='only fetch data for specified application')
        parser.add_argument('--platform', dest='platform', type=str,
                            help='only fetch data for specified platform')
        parser.add_argument('--channel', dest='channel', type=str,
                            help='only fetch data for specified channel(s)')
        parser.add_argument('--start-date', dest='start_date')
        parser.add_argument('--end-date', dest='end_date')

    def update_measures(self, application_name, platform_name, channel_name,
                        submission_date=None, bulk_create=False):
        channels = (Channel.objects.all() if not channel_name else
                    Channel.objects.filter(name=channel_name))
        platforms = (Platform.objects.all() if not platform_name else
                     Platform.objects.filter(name=platform_name))
        applications = (Application.objects.all() if not application_name else
                        Application.objects.filter(name=application_name))
        for channel in channels:
            for platform in platforms:
                for application in applications:
                    if Measure.objects.filter(channels=channel, platform=platform,
                                              application=application).exists():
                        update_measures(application.name, platform.name,
                                        channel.name, submission_date=submission_date,
                                        bulk_create=bulk_create)

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
                self.update_measures(options['application'], options['platform'],
                                     options['channel'], submission_date=current,
                                     bulk_create=False)
                current += datetime.timedelta(days=1)
        else:
            self.update_measures(options['application'], options['platform'],
                                 options['channel'], bulk_create=True)
