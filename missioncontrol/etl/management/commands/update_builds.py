import aiohttp
import asyncio
import json
import sys

from django.core.management.base import BaseCommand

from missioncontrol.etl.builds import update_builds


class Command(BaseCommand):
    """Management command to update data for a specific experiment"""

    def handle(self, *args, **options):
        update_builds()
