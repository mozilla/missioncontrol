from django.conf.urls import url

from missioncontrol.api import views


urlpatterns = [
    url(r'^aggregates/$', views.aggregates, name='aggregates'),
    url(r'^measures_with_interval/$', views.windowed_aggregates, name='measures_with_interval'),

]
