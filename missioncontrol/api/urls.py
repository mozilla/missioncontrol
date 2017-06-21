from django.conf.urls import url

from missioncontrol.api import views


urlpatterns = [
    url(r'^aggregates/$', views.aggregates, name='aggregates'),
]
