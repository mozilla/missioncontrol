from django.core.management.base import BaseCommand

from missioncontrol.etl.tasks import update_experiment_list


class Command(BaseCommand):
    """Management command to update data for a specific experiment"""

    def handle(self, *args, **options):
        update_experiment_list()
