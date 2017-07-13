from django.conf.urls import url

from missioncontrol.api import views


urlpatterns = [
    url(r'^aggregates/$', views.aggregates, name='aggregates'),
    url(r'^measures_with_interval/$', views.measures_with_interval, name='measures_with_interval'),
    url(r'^versions/$', views.versions, name='firefox_versions'),
]
