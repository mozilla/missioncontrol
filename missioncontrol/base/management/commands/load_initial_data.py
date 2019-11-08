from django.core.management import call_command
from django.core.management.base import BaseCommand

from missioncontrol.base.models import (Application,
                                        Channel,
                                        Measure,
                                        Platform)


class Command(BaseCommand):
    help = "Load initial data into the master db"

    def handle(self, *args, **options):
        call_command('loaddata', 'base_metadata')

        # load some data procedurally that would be tedious to define
        # manually in json or yaml
        DESKTOP_CRASH_MEASURES = [
            'content_crashes',
            'gmplugin_crashes',
            'main_crashes',
            'plugin_crashes',
            'content_shutdown_crashes',
            'startup_crashes'
        ]

        FIREFOX_APPLICATION = Application.objects.get(name='firefox')

        # all crash measures and a small number of quality measures are
        # applicable to all desktop platforms and channels
        for platform in Platform.objects.exclude(name='android'):
            for measure_name in DESKTOP_CRASH_MEASURES:
                measure, _ = Measure.objects.update_or_create(
                    name=measure_name, application=FIREFOX_APPLICATION,
                    platform=platform, defaults={'enabled': True})
                measure.channels.set(Channel.objects.all())
                measure.save()

        # gpu crashes is windows only
        gpu_crashes_measure, _ = Measure.objects.update_or_create(
            name='gpu_crashes',
            min_version=53,
            application=FIREFOX_APPLICATION,
            platform=Platform.objects.get(name='windows'),
            defaults={'enabled': True})
        gpu_crashes_measure.channels.set(Channel.objects.all())
        gpu_crashes_measure.save()

        # create a set of non-platform-specific crash measures for experiments
        for measure_name in DESKTOP_CRASH_MEASURES + DESKTOP_CRASH_MEASURES:
            Measure.objects.get_or_create(name=measure_name, platform=None)

        # android / fennec only has a single quality measure: main_crashes
        measure, _ = Measure.objects.update_or_create(
            name='main_crashes',
            application=Application.objects.get(name='fennec'),
            platform=Platform.objects.get(name='android'),
            defaults={'enabled': True})
        # there is no android/fennec on esr
        measure.channels.set(Channel.objects.exclude(name__in=['esr']))
        measure.save()
