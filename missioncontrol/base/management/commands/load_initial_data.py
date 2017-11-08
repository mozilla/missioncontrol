from django.core.management import call_command
from django.core.management.base import BaseCommand

from missioncontrol.base.models import (Measure,
                                        Platform)


class Command(BaseCommand):
    help = "Load initial data into the master db"

    def handle(self, *args, **options):
        call_command('loaddata', 'base_metadata')

        # load some data procedurally that would be tedious to define
        # manually
        CRASH_MEASURES = [
            'content_crashes',
            'gmplugin_crashes',
            'main_crashes',
            'plugin_crashes',
            'content_shutdown_crashes'
        ]
        QUALITY_MEASURES = [
            'browser_shim_usage_blocked',
            'permissions_sql_corrupted',
            'defective_permissions_sql_removed',
            'slow_script_notice_count',
            'slow_script_page_count'
        ]

        for platform in Platform.objects.all():
            for measure_name in CRASH_MEASURES + QUALITY_MEASURES:
                Measure.objects.get_or_create(name=measure_name, platform=platform)
