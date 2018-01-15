from django.conf.urls import url

from missioncontrol.api import views


urlpatterns = [
    url(r'^aggregates/$', views.aggregates, name='aggregates'),
    url(r'^channel-platform-summary/$', views.channel_platform_summary,
        name='channel-platform-summary'),
    url(r'^measure/$', views.measure, name='measure'),
    url(r'^experiment/$', views.experiment, name='experiment'),
]
