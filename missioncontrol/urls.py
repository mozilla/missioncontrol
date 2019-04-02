from django.conf import settings
from django.conf.urls import include, url
from django.contrib import admin
from django.urls import path
from django.views.static import serve as static_serve

from .api import urls as api_urls

urlpatterns = [
    path("admin/", admin.site.urls),
    url(r"^api/", include(api_urls)),
    # contribute.json url
    url(
        r"^(?P<path>contribute\.json)$", static_serve, {"document_root": settings.ROOT}
    ),
]
