from django.http import JsonResponse
from django.conf import settings
from django.core import serializers
from pyhive import presto


def total_count(request):
    cursor = presto.connect('presto').cursor()
    cursor.execute('SELECT * FROM hive.default.error_aggregates')
    results = cursor.fetchall()
    return JsonResponse(dict(results=list(results)))
