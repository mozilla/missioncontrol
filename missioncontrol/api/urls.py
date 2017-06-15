from django.conf.urls import url

from missioncontrol.api import views


urlpatterns = [
    url(r'^total-count/$', views.total_count, name='home'),
]
