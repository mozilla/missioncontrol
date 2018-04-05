from django.core.management import call_command
from django.core.management.base import BaseCommand

from missioncontrol.base.models import (Channel,
                                        Measure,
                                        Platform)


class Command(BaseCommand):
    help = "Load initial data into the master db"

    def handle(self, *args, **options):
        call_command('loaddata', 'base_metadata')

        # load some data procedurally that would be tedious to define
        # manually in json or yaml
        CRASH_MEASURES = [
            'content_crashes',
            'gmplugin_crashes',
            'main_crashes',
            'plugin_crashes',
            'content_shutdown_crashes'
        ]
        UNIVERSAL_QUALITY_MEASURES = [
            'browser_shim_usage_blocked',
        ]
        PRERELEASE_QUALITY_MEASURES = [
            'slow_script_notice_count',
            'slow_script_page_count',
            'permissions_sql_corrupted',
            'defective_permissions_sql_removed',
        ]

        # most crash measures and a small number of quality measures are
        # applicable to all platforms and channels
        for platform in Platform.objects.all():
            for measure_name in CRASH_MEASURES + UNIVERSAL_QUALITY_MEASURES:
                measure, _ = Measure.objects.update_or_create(
                    name=measure_name, platform=platform,
                    defaults={'enabled': True})
                measure.channels = Channel.objects.all()
                measure.save()

        # gpu crashes is the only exception: it is windows only
        gpu_crashes_measure, _ = Measure.objects.update_or_create(
            name='gpu_crashes',
            min_version=53,
            platform=Platform.objects.get(name='windows'),
            defaults={'enabled': True})
        gpu_crashes_measure.channels = Channel.objects.all()
        gpu_crashes_measure.save()

        # most quality measures are on beta/nightly only
        development_channels = Channel.objects.filter(
            name__in=['nightly', 'beta'])
        for platform in Platform.objects.all():
            for measure_name in PRERELEASE_QUALITY_MEASURES:
                measure, _ = Measure.objects.update_or_create(
                    name=measure_name, platform=platform,
                    defaults={'enabled': True})
                measure.channels = development_channels
                measure.save()

        # create a set of non-platform-specific crash measures for experiments
        for measure_name in CRASH_MEASURES:
            Measure.objects.get_or_create(name=measure_name, platform=None)
